export async function* sseStream(url: string) {
  const res = await fetch(url);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
      const data = chunk.replace(/^data: /gm, "");
      yield JSON.parse(data);
    }
  }
}
