import { useEffect, useState } from 'react';
import { btn, btnPrimary, Card, PageTitle } from '../components/ui';
import { connectArduino, serialSupported } from '../services/arduino';
import { pushToast } from '../store/live';

// Outlives this page so the Arduino stays connected while you browse the dashboard.
let stopArduino: (() => void) | undefined;

function ArduinoCard() {
  const [on, setOn] = useState(!!stopArduino);
  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(serialSupported()), []); // after mount: the server render has no navigator
  const connect = async () => {
    try {
      stopArduino = await connectArduino(9600, () => { stopArduino = undefined; setOn(false); });
      setOn(true);
      pushToast('success', 'Arduino connected');
    } catch (err) {
      if ((err as Error).name !== 'NotFoundError') pushToast('error', `Could not open the port: ${(err as Error).message}`); // NotFoundError = picker cancelled
    }
  };
  return (
    <Card title="Arduino (USB)">
      <p className="mb-3 text-sm text-slate-400">
        Plug the board in, then connect. Its signal and ultrasonic readings replace the simulated ones for that intersection. Sketch: <code>arduino/traffic_light/traffic_light.ino</code>.
      </p>
      {!supported ? (
        <p className="text-sm text-amber-400">This browser has no Web Serial. Use Chrome or Edge on desktop.</p>
      ) : on ? (
        <button type="button" className={btn} onClick={() => stopArduino?.()}>Disconnect</button>
      ) : (
        <button type="button" className={btnPrimary} onClick={connect}>Connect Arduino</button>
      )}
    </Card>
  );
}

// shortcut: Settings CRUD (intersections, cameras, sensors, speed limits, timing, detection, users, retention) is the next build pass.
export default function Settings() {
  return (
    <div className="space-y-4">
      <PageTitle title="Settings" sub="Connect the Arduino and manage the system." />
      <ArduinoCard />
      <Card>
        <p className="text-sm text-slate-400">
          Configuration for intersections, cameras, sensors, speed limits, signal timing, detection, users and data retention is coming in the next build pass.
        </p>
      </Card>
    </div>
  );
}
