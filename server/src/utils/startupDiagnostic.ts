/** Classify privately, then emit only fixed messages. Never interpolate driver errors. */
export function startupDiagnostic(stage: string, error: unknown): string {
  const value = error instanceof Error ? error : new Error('Unknown startup error');
  const code = String((value as Error & { code?: unknown }).code || '');
  const detail = value.message;
  let action = 'Review server configuration and database availability.';
  if (detail === 'INVALID_MONGODB_DNS_SERVERS') action = 'MONGODB_DNS_SERVERS must contain valid DNS server IP addresses.';
  else if (/querySrv|queryTxt|ENOTFOUND|ESERVFAIL|ECONNREFUSED|ETIMEOUT/.test(detail) || /ENOTFOUND|ESERVFAIL|ECONNREFUSED|ETIMEOUT/.test(code)) action = 'DNS or a network connection failed. Check Atlas SRV resolution and network access; configure MONGODB_DNS_SERVERS only if the local resolver is failing.';
  else if (code === '18' || /authentication failed|bad auth|bad credentials/i.test(detail)) action = 'MongoDB authentication failed. Review the Atlas database user and URI credentials.';
  else if (code === '11000') action = 'Database index initialization found duplicate data. Review existing records and indexes before retrying; no records were deleted.';
  else if (code === 'EADDRINUSE') action = 'The configured PORT is already in use. Stop the existing server or select another port.';
  else if (value.name === 'MongooseServerSelectionError') action = 'MongoDB servers are unreachable. Review Atlas network access, cluster availability, firewall and DNS.';
  return `Server startup failed during ${stage}. ${action} Secret details withheld.`;
}
