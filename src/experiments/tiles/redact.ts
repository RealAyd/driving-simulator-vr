/** Removes a Google API key from anything that may be shown or logged. */
export const redact=(text:string)=>text.replace(/([?&]key=)[^&\s"']+/g,'$1…').replace(/AIza[0-9A-Za-z_-]{20,}/g,'…');
