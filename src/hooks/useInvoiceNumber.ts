/**
 * The invoice number the next shipment should carry, and a way to claim it.
 *
 * Reads the active CAI authorization and the numbers already issued against
 * it, both from Dataverse. `problem` carries the reason when a number cannot
 * be given out — an exhausted range or an expired authorization is something
 * the nursery has to act on, and showing an empty field instead would hide it
 * until an invoice went out unnumbered.
 */

import { useCallback, useMemo } from "react";
import { useRecords } from "./useRecords";
import {
  activeAuthorization,
  nextNumber,
  parseSequence,
  type CaiNumberRow,
  type FiscalAuthRow,
  type NextNumber,
} from "../services/fiscalNumbering";

export function useInvoiceNumber(): {
  next: NextNumber | null;
  /** Records the number as issued so it can never be handed out twice. */
  claim: (printed: string, invoiceId?: string) => void;
} {
  const [fiscal, setFiscal] = useRecords<FiscalAuthRow>("fiscal", []);
  const [issued, setIssued] = useRecords<CaiNumberRow>("caiNumbers", []);

  const auth = useMemo(
    () => activeAuthorization(fiscal),
    [fiscal]
  );

  const next = useMemo(
    () => nextNumber(auth, issued),
    [auth, issued]
  );

  const claim = useCallback(
    (printed: string, invoiceId?: string) => {
      if (!auth) return;
      const sequence = parseSequence(printed);
      if (!Number.isFinite(sequence)) return;

      // A row with no id is created by the store; this is the audit record of
      // the number being issued, written before the pointer moves. If the
      // pointer update were to fail the number still reads as used, which is
      // the safe direction — a gap in the sequence can be explained, the same
      // number on two invoices cannot.
      setIssued((rows) => [
        ...rows,
        {
          id: "",
          name: printed,
          sequence,
          used: true,
          usedDate: new Date().toISOString().slice(0, 10),
          fiscalAuth: auth.name,
          ...(invoiceId ? { invoice: invoiceId } : {}),
        },
      ]);

      const last = parseSequence(auth.rangeEnd ?? "");
      if (Number.isFinite(last) && sequence + 1 <= last) {
        setFiscal((rows) =>
          rows.map((r) =>
            r.id === auth.id ? { ...r, next: sequence + 1 } : r
          )
        );
      }
    },
    [auth, setIssued, setFiscal]
  );

  return { next, claim };
}
