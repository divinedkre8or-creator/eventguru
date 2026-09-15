/**
 * IndexNow Protocol Helper for EventRally (https://www.geteventrally.com)
 * Submits created, updated, or deleted URLs directly to Bing / IndexNow endpoints.
 */

const HOST = "www.geteventrally.com";
const KEY = "e4a28f89b9d34208a5598179426f0ec4"; // IndexNow key
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

export interface IndexNowResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
}

/**
 * Submits a batch of URLs to the IndexNow search engine endpoint.
 */
export async function submitToIndexNow(urls: string[]): Promise<IndexNowResponse> {
  if (!urls || urls.length === 0) {
    return { success: false, message: "No URLs provided" };
  }

  // Format full URLs if paths were passed
  const formattedUrls = urls.map((url) =>
    url.startsWith("http") ? url : `https://${HOST}${url.startsWith("/") ? "" : "/"}${url}`
  );

  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: formattedUrls,
  };

  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok || response.status === 200 || response.status === 202) {
      return { success: true, statusCode: response.status, message: "IndexNow submission accepted." };
    } else {
      return {
        success: false,
        statusCode: response.status,
        message: `IndexNow responded with status ${response.status}`,
      };
    }
  } catch (error: any) {
    console.warn("IndexNow submission warning:", error?.message || error);
    return { success: false, message: error?.message || "IndexNow network request failed" };
  }
}
