let db;
let products = [];
let scannedBarcode = "";

/* =========================
   NORMALISATION
========================= */
function normalize(v) {
  return String(v || "").trim().toLowerCase();
}

/* =========================
   INIT IndexedDB
========================= */
const request = indexedDB.open("StockDB", 1);

request.onupgradeneeded = function (e) {
  db = e.target.result;

  const store = db.createObjectStore("products", {
    keyPath: "barcode"
  });

  store.createIndex("name", "name", { unique: false });
};

request.onsuccess = function (e) {
  db = e.target.result;
  loadProducts();
};

/* =========================
   LOAD
========================= */
function loadProducts() {
  const tx = db.transaction("products", "readonly");
  const store = tx.objectStore("products");

  const req = store.getAll();

  req.onsuccess = () => {
    products = req.result || [];
    render(products);
  };
}

/* =========================
   RENDER
========================= */
function render(list) {
  const container = document.getElementById("productList");
  container.innerHTML = "";

  list.forEach(p => {
    container.innerHTML += `
      <div class="card">
        <b>${p.name}</b><br>
        Code: ${p.barcode}<br>
        Prix: ${p.sell} DA<br>
        Stock: ${p.qty}
      </div>
    `;
  });
}

/* =========================
   SEARCH BUTTON
========================= */
function searchProduct() {
  const value = normalize(document.getElementById("searchInput").value);

  if (!value) {
    render(products);
    return;
  }

  const filtered = products.filter(p =>
    normalize(p.barcode) === value ||
    normalize(p.name).includes(value)
  );

  render(filtered);
}

/* =========================
   SAVE PRODUCT
========================= */
function saveProduct(p) {
  const tx = db.transaction("products", "readwrite");
  const store = tx.objectStore("products");
  store.put(p);
}

/* =========================
   SCANNER FIX (IMPORTANT)
========================= */
function startScanner() {
  document.getElementById("scanner").classList.remove("hidden");

  Quagga.init({
    inputStream: {
      type: "LiveStream",
      target: document.querySelector("#scanner"),
      constraints: {
        facingMode: "environment",
        width: 640,
        height: 480
      }
    },
    decoder: {
      readers: [
        "ean_reader",
        "ean_8_reader",
        "code_128_reader"
      ]
    },
    locate: true
  }, function (err) {
    if (err) {
      console.error(err);
      return;
    }
    Quagga.start();
  });

  Quagga.offDetected();
  Quagga.onDetected(onScan);
}

/* =========================
   SCAN RESULT FIX
========================= */
function onScan(result) {
  scannedBarcode = normalize(result.codeResult.code);

  Quagga.stop();
  document.getElementById("scanner").classList.add("hidden");

  const found = products.find(p =>
    normalize(p.barcode) === scannedBarcode
  );

  if (found) {
    alert("Produit : " + found.name);
  } else {
    openForm(scannedBarcode);
  }
}

/* =========================
   FORM
========================= */
function openForm(barcode) {
  document.getElementById("productForm").classList.remove("hidden");
  document.getElementById("pBarcode").value = barcode;
}

function closeForm() {
  document.getElementById("productForm").classList.add("hidden");
}

/* =========================
   SAVE NEW PRODUCT
========================= */
function saveNewProduct() {
  const p = {
    name: document.getElementById("pName").value,
    barcode: normalize(document.getElementById("pBarcode").value),
    buy: Number(document.getElementById("pBuy").value) || 0,
    sell: Number(document.getElementById("pSell").value) || 0,
    qty: Number(document.getElementById("pQty").value) || 0
  };

  saveProduct(p);
  closeForm();
  loadProducts();
}

/* =========================
   IMPORT EXCEL
========================= */
document.getElementById("excelFile").addEventListener("change", function (e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function (evt) {
    const data = new Uint8Array(evt.target.result);
    const wb = XLSX.read(data, { type: "array" });

    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    json.forEach(item => {
      saveProduct({
        name: item.Nom || "",
        barcode: normalize(item["Code-barres"]),
        buy: Number(item["Coût"]) || 0,
        sell: Number(item["Prix de vente"]) || 0,
        qty: Number(item["Quantité disponible"]) || 0
      });
    });

    loadProducts();
  };

  reader.readAsArrayBuffer(file);
});

/* =========================
   EXPORT
========================= */
function exportExcel() {
  const ws = XLSX.utils.json_to_sheet(products);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Stock");
  XLSX.writeFile(wb, "stock.xlsx");
}
