/** Progress is bytes sent by the browser, not cloud processing or DB completion. */
export function uploadWithProgress(
  url: string,
  body: FormData,
  onProgress: (percent: number | null) => void,
): Promise<{ ok: boolean; json: () => Promise<any> }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.timeout = 300_000;
    xhr.upload.onprogress = (event) =>
      onProgress(
        event.lengthComputable
          ? Math.min(100, Math.floor((event.loaded / event.total) * 100))
          : null,
      );
    xhr.onload = () => {
      let result: unknown;
      try {
        result = JSON.parse(xhr.responseText);
      } catch {
        reject(
          new Error(
            "The server returned an unreadable upload response. Check the vehicle’s photos before retrying.",
          ),
        );
        return;
      }
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        json: async () => result,
      });
    };
    xhr.onerror = () =>
      reject(
        new Error(
          "Connection lost during upload. Check the vehicle’s photos before retrying.",
        ),
      );
    xhr.ontimeout = () =>
      reject(
        new Error(
          "Upload timed out. Check the vehicle’s photos before retrying.",
        ),
      );
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    onProgress(null);
    xhr.send(body);
  });
}
