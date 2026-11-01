import Checkout from './Checkout';
import TableCheckout from './TableCheckout';
import { useTableSession } from '../context/table-session';
export default function CheckoutEntry() { const { table } = useTableSession(); return table ? <TableCheckout key={table.token}/> : <Checkout/>; }
