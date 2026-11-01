import { useApiResource } from '../../hooks/useApiResource';
import '../../styles/Sms.css';
export default function SmsConsent({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  const config = useApiResource<{ available: boolean }>('/sms/config');
  if (!config.result?.data.available) return <p className="sms-hint">SMS updates are currently unavailable. Check your account for status updates.</p>;
  return <label className="sms-consent"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)}/><span>Send service SMS updates to my phone number above (optional). No marketing. I can pause SMS updates from my account.</span></label>;
}
