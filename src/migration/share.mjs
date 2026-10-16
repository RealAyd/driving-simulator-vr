// Adapter: caller owns user messages and manual-copy UI. Call from a user gesture.
export async function shareAppLink({url, navigator: nav = globalThis.navigator}) {
  const parsed = new URL(url);
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Expected a web URL');
  parsed.hash = '';
  const link = parsed.href;
  try {
    if (nav?.share) {
      await nav.share({title:'Driving Practice',url:link,text:'Try this driving observation practice'});
      return {status:'shared'};
    }
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(link);
      return {status:'copied'};
    }
  } catch (error) {
    if (error?.name === 'AbortError') return {status:'cancelled'};
  }
  return {status:'manual-copy',url:link};
}
