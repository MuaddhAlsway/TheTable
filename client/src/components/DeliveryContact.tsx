import { normalizeSaudiMobile } from '../utils/saudiPhone';

type Props = { phone: string; orderNumber: string; recipient: 'driver' | 'customer' };

export default function DeliveryContact({ phone, orderNumber, recipient }: Props) {
  const normalized = normalizeSaudiMobile(phone);
  const message = recipient === 'driver'
    ? `Hello, I am contacting you about my The Table order ${orderNumber}.`
    : `Hello, I am your The Table delivery driver for order ${orderNumber}. Please share your delivery code only after receiving your food.`;
  return <>
    {normalized ? <a href={`https://wa.me/${normalized.slice(1)}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${recipient} at ${phone} (opens a new tab)`}>{phone} · WhatsApp</a> : <span>{phone}</span>}
    {' · '}<a href={`tel:${normalized || phone}`} aria-label={`Call ${recipient} at ${phone}`}>Call</a>
  </>;
}
