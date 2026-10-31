import type { InputHTMLAttributes } from "react";

type CheckoutFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name"> & {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  wide?: boolean;
  fixedPrefix?: string;
};
export default function CheckoutField({ name, label, error, hint, wide, fixedPrefix, ...inputProps }: CheckoutFieldProps) {
  const id = `checkout-${name}`;
  const describedBy = [fixedPrefix && `${id}-country`, hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return <div className={`checkout-page__field${wide ? " checkout-page__field--wide" : ""}`}>
    <label htmlFor={id}>{label}</label>
    <div className={fixedPrefix ? "checkout-page__phone-control" : undefined}>
      {fixedPrefix && <span className="checkout-page__phone-country" id={`${id}-country`}>{fixedPrefix}</span>}
      <input {...inputProps} id={id} name={name} aria-invalid={error ? true : undefined} aria-describedby={describedBy} />
    </div>
    {hint && <small id={`${id}-hint`}>{hint}</small>}
    {error && <p className="checkout-page__error" id={`${id}-error`}>{error}</p>}
  </div>;
}
