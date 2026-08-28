/**
 * Who is signed in, from Dataverse.
 *
 * The sidebar said "Santiago G. / Admin" in hardcoded text, which was right
 * for exactly one person and wrong for everyone at the nursery who would
 * eventually open the app.
 *
 * The photo comes from the user's own Dataverse record. It is not fetched
 * from Microsoft Graph: the player sets connect-src 'none', so the browser
 * cannot reach graph.microsoft.com, and routing it through a connector would
 * mean a new connection for a picture. A record with no photo returns none
 * and the caller falls back — see the note on `photo`.
 */

import { useEffect, useState } from "react";
import { getClient } from "@microsoft/power-apps/data";
import { dataSourcesInfo } from "../../.power/schemas/appschemas/dataSourcesInfo";
import { hostingMode } from "../services/tableMap";
import { DATAVERSE_URL, getDataverseToken } from "../services/auth";

export interface CurrentUser {
  id: string;
  name: string;
  /** Job title as recorded in Dataverse; blank if never set. */
  title: string;
  email: string;
  /**
   * A data: URI when the user has a photo on their Dataverse record, and
   * undefined when they do not — which is the common case, since the photo
   * most people recognise lives in Entra rather than here.
   */
  photo?: string;
}

/** "Santiago Garcia Ruiz" -> "SG". Used when there is no photo. */
export function initialsOf(name: string): string {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface UserRow {
  systemuserid?: string;
  fullname?: string;
  title?: string;
  internalemailaddress?: string;
  domainname?: string;
  entityimage?: string;
}

const SELECT = ["fullname", "title", "internalemailaddress", "domainname", "entityimage"];

const toUser = (id: string, row: UserRow): CurrentUser => ({
  id,
  name: String(row.fullname ?? ""),
  title: String(row.title ?? ""),
  email: String(row.internalemailaddress ?? row.domainname ?? ""),
  // Dataverse returns the image as base64; it is only a picture once it has a
  // media type in front of it.
  photo: row.entityimage ? `data:image/jpeg;base64,${row.entityimage}` : undefined,
});

async function loadViaPlayer(): Promise<CurrentUser | null> {
  const client = getClient(dataSourcesInfo);

  const who = await client.executeAsync<unknown, { UserId?: string }>({
    dataverseRequest: {
      action: "customapi",
      parameters: { operationName: "WhoAmI", tableName: "systemuser" },
    },
  });
  const id = who.success ? who.data?.UserId : undefined;
  if (!id) return null;

  const record = await client.retrieveRecordAsync<UserRow>("systemusers", id, { select: SELECT });
  return record.success ? toUser(id, record.data) : null;
}

async function loadViaWebApi(): Promise<CurrentUser | null> {
  const token = await getDataverseToken();
  if (!token) return null;
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  const who = await fetch(`${DATAVERSE_URL}/api/data/v9.2/WhoAmI`, { headers });
  if (!who.ok) return null;
  const { UserId: id } = (await who.json()) as { UserId?: string };
  if (!id) return null;

  const res = await fetch(
    `${DATAVERSE_URL}/api/data/v9.2/systemusers(${id})?$select=${SELECT.join(",")}`,
    { headers }
  );
  return res.ok ? toUser(id, (await res.json()) as UserRow) : null;
}

export function useCurrentUser(): { user: CurrentUser | null; loading: boolean } {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mode = hostingMode();
    if (mode === "demo") {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (mode === "standalone" ? loadViaWebApi() : loadViaPlayer())
      .then((result) => {
        if (!cancelled) setUser(result);
      })
      .catch((err) => {
        // Not knowing who is signed in is not worth breaking the sidebar over.
        console.error("[user] could not read the signed-in user", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading };
}
