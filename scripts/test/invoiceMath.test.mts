/**
 * Checks the invoice arithmetic. Run: npm run test:math
 *
 * Worth having as a test rather than a one-off: these numbers are a tax
 * calculation and a currency conversion, and both are wrong in ways nobody
 * notices until a filing or a customer disagrees.
 */
import { invoiceAmounts, invoiceStatus, ageBucket, toHNL, totalInHNL, paidAgainst } from '../../src/services/invoiceMath.ts'
let failures = 0
const eq = (label: string, got: unknown, want: unknown) => {
  const pass = String(got) === String(want)
  if (!pass) failures++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(46)} got ${JSON.stringify(got)}${pass ? '' : ` want ${JSON.stringify(want)}`}`)
}

// export invoice: zero-rated, so total equals subtotal
eq('export 1520 USD -> isv 0', invoiceAmounts(1520,{exempt:true}).isv, 0)
eq('export 1520 USD -> total 1520', invoiceAmounts(1520,{exempt:true}).total, 1520)
// local sale: 15% applies
eq('local 1000 HNL -> isv 150', invoiceAmounts(1000).isv, 150)
eq('local 1000 HNL -> total 1150', invoiceAmounts(1000).total, 1150)
// part payment
eq('1000 local, paid 400 -> balance 750', invoiceAmounts(1000,{paid:400}).balance, 750)
// rounding: the classic third-of-a-cent case
eq('333.33 * 0.15 rounds to 50.00', invoiceAmounts(333.33).isv, 50)
// currency
eq('600 USD at 26.5543 -> 15932.58 HNL', toHNL(600,'USD',26.5543), 15932.58)
eq('mixed 600 USD + 1200 HNL -> 17132.58', totalInHNL([{amount:600,currency:'USD'},{amount:1200,currency:'HNL'}],26.5543), 17132.58)
// ageing
const today=new Date('2026-08-28')
eq('due 2026-09-27 -> Current', ageBucket('2026-09-27',today), 'Current')
eq('due 2026-08-10 -> 1-30', ageBucket('2026-08-10',today), '1-30')
eq('due 2026-05-01 -> 90+', ageBucket('2026-05-01',today), '90+')
// status follows payment, not what someone typed
eq('paid in full -> Paid', invoiceStatus(1000,1000,'2026-09-27',today), 'Paid')
eq('part paid, in date -> Partially Paid', invoiceStatus(1000,400,'2026-09-27',today), 'Partially Paid')
eq('part paid, late -> Overdue', invoiceStatus(1000,400,'2026-07-01',today), 'Overdue')
// payments applied to an invoice, ignoring voided ones
eq('applied ignores Voided', paidAgainst('inv1',[
  {invoice:'inv1',amount:300,status:'Cleared'},
  {invoice:'inv1',amount:100,status:'Voided'},
  {invoice:'inv2',amount:999,status:'Cleared'}]), 300)

console.log(failures ? `\n  ${failures} failed` : '\n  all passed')
process.exit(failures ? 1 : 0)
