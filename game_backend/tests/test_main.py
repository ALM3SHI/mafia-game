import base64
import dataclasses

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import main


@pytest.fixture()
def client(monkeypatch):
    # Bypass the model-loading lifespan.
    app = FastAPI()
    app.add_api_websocket_route("/ws/audio", main.audio_endpoint)
    app.add_api_websocket_route("/ws/clone", main.clone_endpoint)
    monkeypatch.setattr(main, "whisper_model", object())
    monkeypatch.setattr(main, "transcribe_blocking", lambda path: "مين المافيا؟")

    async def fake_stream(prompt):
        for piece in ["والله ", "مو أنا. ", "اسأل غيري!"]:
            yield piece

    monkeypatch.setattr(main, "stream_ollama", fake_stream)

    async def fake_tts(text, ref, voice_id):
        return b"RIFFfake", {"cached": False, "gen_s": 0.0, "wait_s": 0.0}

    monkeypatch.setattr(main, "synth_tts", fake_tts)
    return TestClient(app)


def _audio_msg(**extra):
    msg = {"event": "audio_complete", "audio_data": base64.b64encode(b"x" * 100).decode(), "speaker_id": "bot-1"}
    msg.update(extra)
    return msg


def test_full_turn_streams_transcript_chunks_and_done(client):
    with client.websocket_connect("/ws/audio") as ws:
        ws.send_json(_audio_msg())
        assert ws.receive_json() == {"status": "transcript", "text": "مين المافيا؟"}
        first = ws.receive_json()
        assert first["status"] == "chunk" and first["index"] == 0
        second = ws.receive_json()
        assert second["status"] == "chunk" and second["index"] == 1
        done = ws.receive_json()
        assert done["status"] == "done" and done["sentence_count"] == 2


def test_bad_json_and_bad_base64_do_not_kill_the_socket(client):
    with client.websocket_connect("/ws/audio") as ws:
        ws.send_text("not json")
        assert ws.receive_json()["status"] == "error"
        ws.send_json(_audio_msg(audio_data="@@@not-base64@@@"))
        assert ws.receive_json()["status"] == "error"
        # Still alive: a valid turn works afterwards.
        ws.send_json(_audio_msg())
        assert ws.receive_json()["status"] == "transcript"


def test_oversized_audio_rejected(client, monkeypatch):
    monkeypatch.setattr(main, "MAX_AUDIO_B64_CHARS", 10)
    with client.websocket_connect("/ws/audio") as ws:
        ws.send_json(_audio_msg())
        assert ws.receive_json()["status"] == "error"


def test_api_key_header_or_query(client, monkeypatch):
    monkeypatch.setattr(main, "settings", dataclasses.replace(main.settings, api_key="s3cret"))
    with pytest.raises(Exception):
        with client.websocket_connect("/ws/audio") as ws:
            ws.receive_json()
    with client.websocket_connect("/ws/audio?token=s3cret") as ws:
        ws.send_json(_audio_msg())
        assert ws.receive_json()["status"] == "transcript"
    with client.websocket_connect("/ws/audio", headers={"Authorization": "Bearer s3cret"}) as ws:
        ws.send_json(_audio_msg())
        assert ws.receive_json()["status"] == "transcript"


def test_ref_audio_cannot_escape_data_dir(tmp_path, monkeypatch):
    data = tmp_path / "data"
    (data / "clones").mkdir(parents=True)
    (data / "clones" / "ok.wav").write_bytes(b"RIFF")
    secret = tmp_path / "secret.txt"
    secret.write_text("nope")
    monkeypatch.setattr(main.settings.__class__, "data_path", property(lambda self: data))

    assert main.resolve_ref_audio("clones/ok.wav") == str((data / "clones" / "ok.wav").resolve())
    assert main.resolve_ref_audio("../secret.txt") is None
    assert main.resolve_ref_audio(str(secret)) is None
    assert main.resolve_ref_audio("clones/missing.wav") is None


def test_prompt_does_not_leak_other_roles():
    prompt = main.build_system_prompt({
        "speaker": {"id": "b1", "name": "الذيب", "role": "مواطن", "mafiaTeammates": []},
        "humanName": "عمر",
        "alivePlayers": ["الذيب", "الصقر", "عمر"],
        "deadPlayers": [{"name": "الشبح", "role": "طبيب"}],
    })
    assert "الذيب" in prompt and "عمر" in prompt
    assert "مافيا وشركاؤك" not in prompt
    mafia_prompt = main.build_system_prompt({"speaker": {"name": "الصقر", "role": "مافيا", "mafiaTeammates": ["النمر"]}})
    assert "النمر" in mafia_prompt and "لا تعترف" in mafia_prompt


def test_sentence_splitting():
    assert main.split_into_sentences("مرحبا. كيف حالك؟ تمام") == ["مرحبا.", "كيف حالك؟", "تمام"]
    assert main.clean_text_for_tts("ههههه (يضحك) طيب") == "طيب"
