import { Card } from '../components/ui';

// shortcut: Settings CRUD (intersections, cameras, sensors, speed limits, timing, detection, users, retention) is the next build pass.
export default function Settings() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
      <Card>
        <p className="text-sm text-slate-400">
          Configuration for intersections, cameras, sensors, speed limits, signal timing, detection, users and data retention is coming in the next build pass.
        </p>
      </Card>
    </div>
  );
}
