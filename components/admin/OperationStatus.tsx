import { CheckCircle2, CircleDot } from 'lucide-react';

export function BusyIndicator({ label }: { label: string }) {
  return <span className="dh-busy" role="status"><CircleDot className="dh-wheel" size={20} aria-hidden="true" /><span>{label}</span></span>;
}
export function SuccessNotice({ message }: { message: string }) {
  return <div className="dh-success" role="status"><CheckCircle2 size={20} aria-hidden="true" /><span>{message}</span></div>;
}
export function UploadProgress({ percent, count }: { percent: number | null; count: number }) {
  return <div className="dh-upload-progress"><BusyIndicator label={percent === 100 ? `Transfer complete. Saving ${count} photos…` : `Transferring ${count} photos…`} />{percent != null && <><progress value={percent} max={100} aria-label="Photo transfer progress" /><p className="dh-fine">{percent}% transferred{percent === 100 ? ' · Waiting for the server to finish saving' : ''}</p></>}</div>;
}
