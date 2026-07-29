// Common util functions
export async function getSourceData(apiURl: any) {
  try {
    const res = await fetch(apiURl);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error Fetching Data", error);
  }
}
