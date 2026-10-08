import { ShieldCheck, Smartphone, Cpu, Siren } from 'lucide-react';
import Card from '../components/Card';

const steps = [
  { icon: Smartphone, title: 'Your device', text: 'Location and microphone access are requested only when you enable the related feature.' },
  { icon: Cpu, title: 'Available signal processing', text: 'Motion heuristics run on the device. Voice transcription and transcript classification use pretrained providers when configured. Verified area-risk data is not connected.' },
  { icon: Siren, title: 'Contact alerts after confirmation', text: 'An alert is recorded after you confirm. If the server has a configured provider, opted-in contacts receive an SMS/call; otherwise you can text or call from your device. No emergency service is contacted.' },
];

export default function PrivacyPage() {
  return <div className="space-y-5">
    <div><h1 className="text-2xl font-bold">Privacy & data use</h1><p className="mt-1 max-w-2xl text-sm text-muted">Safety features depend on sensitive signals. This prototype keeps the boundaries visible and avoids unsupported security claims.</p></div>
    <Card title="How information flows" icon={<ShieldCheck size={16} />}>
      <ol className="grid gap-3 md:grid-cols-3">{steps.map(({ icon: Icon, title, text }, i) => <li key={title} className="rounded-xl border border-line p-4"><div className="flex items-center gap-2 text-primary"><span className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-bold">{i + 1}</span><Icon size={18} /><b className="text-sm text-fg">{title}</b></div><p className="mt-3 text-sm text-muted">{text}</p></li>)}</ol>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-center text-xs font-semibold sm:text-sm"><span className="rounded-lg bg-bg px-3 py-2">USER DEVICE</span><span aria-hidden="true" className="text-primary">→</span><span className="rounded-lg bg-bg px-3 py-2">RISK ANALYSIS</span><span aria-hidden="true" className="text-primary">→</span><span className="rounded-lg bg-bg px-3 py-2">ALERT AFTER CONFIRMATION</span></div>
    </Card>
    <Card title="Permissions and retention">
      <ul className="space-y-3 text-sm text-muted"><li><b className="text-fg">Location:</b> requested only after you press Enable location. Coordinates are included in an alert only after you confirm it. You can revoke location access in browser settings.</li><li><b className="text-fg">Motion sensors:</b> accelerometer and gyroscope readings start only after you press Start motion monitoring and grant browser permission when requested. Readings are processed on this device and are not uploaded.</li><li><b className="text-fg">Voice:</b> recording starts only when you press Record and stops after at most 10 seconds or when you press Stop. The app holds audio in memory, does not save or log it, and sends it to the configured transcription provider. The transcript is sent to the configured classification provider. Text classification does not detect distress from tone of voice or establish that a real emergency is happening.</li><li><b className="text-fg">Risk data:</b> seeded crime and danger-zone results are hidden. Verified incident data is not connected.</li><li><b className="text-fg">Emergency records:</b> confirmed and dismissed events are stored for history. If the API is unavailable, events remain in this browser’s local storage.</li><li><b className="text-fg">Contact delivery:</b> provider-based SMS/calls require server credentials and are disabled by default. Only contacts whose alert permission is enabled are included. Without provider setup, you can open the phone’s SMS or call app after confirming.</li></ul>
    </Card>
  </div>;
}
