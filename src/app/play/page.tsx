'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, WifiOff } from 'lucide-react';
import { useGame } from '@/client/game-store';
import { useProfile } from '@/client/profile';
import { Lobby } from '@/components/play/Lobby';
import { Table } from '@/components/play/Table';
import { Button, Panel } from '@/components/ui';

function PlayInner() {
  const router = useRouter();
  const params = useSearchParams();
  const view = useGame(s => s.view);
  const status = useGame(s => s.status);
  const fatal = useGame(s => s.fatal);
  const hydrated = useProfile(s => s.hydrated);
  const started = useRef(false);

  // Decide what to connect to once the profile is loaded.
  useEffect(() => {
    if (!hydrated || started.current) return;
    started.current = true;
    const g = useGame.getState();
    const joinCode = params.get('join');
    if (joinCode) {
      g.joinOnline(joinCode);
      router.replace('/play');
      return;
    }
    if (g.transport) return;
    if (!g.resumeOnline()) router.replace('/');
  }, [hydrated, params, router]);

  const leave = () => {
    useGame.getState().leave();
    router.push('/');
  };

  if (fatal && !view) {
    return (
      <Centered>
        <WifiOff className="mx-auto mb-3 h-10 w-10 text-blood-hi" />
        <p className="mb-5 text-fog">{fatal}</p>
        <Button onClick={leave}>رجوع للرئيسية</Button>
      </Centered>
    );
  }

  if (!view) {
    return (
      <Centered>
        <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-brass" />
        <p className="font-kufi text-fog">{status === 'reconnecting' ? 'نحاول نرجع الاتصال...' : 'ندخلك المدينة...'}</p>
        <button onClick={leave} className="mt-4 text-sm text-mist hover:text-fog">
          إلغاء
        </button>
      </Centered>
    );
  }

  return (
    <>
      {status === 'reconnecting' && <div className="fixed inset-x-0 top-0 z-[250] bg-blood/80 py-1 text-center font-kufi text-sm text-fog">انقطع الاتصال... نحاول نرجع</div>}
      {view.phase === 'lobby' ? <Lobby view={view} onLeave={leave} /> : <Table view={view} onLeave={leave} />}
    </>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <Panel className="w-full max-w-sm p-8 text-center">{children}</Panel>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense>
      <PlayInner />
    </Suspense>
  );
}
