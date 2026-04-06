async function test() {
  const targetUrl = 'https://dwaprices.com/routing.php';
  const proxyUrl = `https://cors.eu.org/${targetUrl}`;
  
  const formData = new URLSearchParams();
  formData.append('search', '1');
  formData.append('searchq', 'panadol');
  formData.append('order_by', 'name ASC');

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: formData.toString()
    });
    const text = await response.text();
    const data = JSON.parse(text);
    const items = data.data || data;
    for (let i = 0; i < Math.min(5, items.length); i++) {
      console.log(`Item ${i}:`, items[i].name);
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
