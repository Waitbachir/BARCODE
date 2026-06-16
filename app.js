let db;
let products = [];
let scannedBarcode = null;

/* =========================
   NORMALISATION BARCODE
========================= */
function normalizeBarcode(code) {
  return String(code || "").trim();
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

  store.createIndex("barcode", "barcode", { unique: true });
};

request.onsuccess = function (e) {
  db = e.target.result;
  loadProducts();
};

request.onerror = function () {
  console.error("Erreur IndexedDB");
};

/* =========================
   LOAD PRODUCTS
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
   RENDER LIST
========================= */
function render(list) {
  const container = document.getElementById("productList");
  container.innerHTML = "";

  list.forEach(p => {
    container.innerHTML += `
      <div class="product">
        <b>${p.name}</b><br>
        Code: ${p.barcode}<br>
        Prix vente: ${p.sell} DA<br>
        Stock: ${p.qty}
      </div>
    `;
  });
}

/* =========================
   SAVE PRODUCT (PROMISE)
========================= */
function saveProduct(product) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("products", "readwrite");
    const store = tx.objectStore("products");

    const req = store.put(product);

    req.onsuccess = () => resolve();
    req.onerror = () => reject();
  });
}

/* =========================
   IMPORT EXCEL
========================= */
document.getElementById("excelFile").addEventListener("change", function (e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = async function (evt) {
    const data = new Uint8Array(evt.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    for (const item of json) {
      await saveProduct({
        name: item.Nom || "",
        barcode: normalizeBarcode(item["Code-barres"]),
        buy: Number(item["Coût"]) || 0,
        sell: Number(item["Prix de vente"]) || 0,
        qty: Number(item["Quantité disponible"]) || 0
      });
    }

    loadProducts();
  };

  reader.readAsArrayBuffer(file);
});

/* =========================
   SEARCH DIRECT IndexedDB
========================= */
function findProduct(barcode, callback) {
  const tx = db.transaction("products", "readonly");
  const store = tx.objectStore("products");

  const req = store.get(barcode);

  req.onsuccess = () => {
    callback(req.result);
  };
}

/* =========================
   SCANNER
========================= */
function startScanner() {
  document.getElementById("scanner").classList.remove("hidden");

  Quagga.init({
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: document.querySelector("#scanner"),
      constraints: {
        facingMode: "environment"
      }
    },
    decoder: {
      readers: ["ean_reader", "code_128_reader", "ean_8_reader"]
    }
  }, function (err) {
    if (err) {
      console.error(err);
      return;
    }
    Quagga.start();
  });

  Quagga.offDetected(); // éviter doublons
  Quagga.onDetected(onScan);
}

/* =========================
   ON SCAN RESULT
========================= */
function onScan(result) {
  scannedBarcode = normalizeBarcode(result.codeResult.code);

  Quagga.stop();
  document.getElementById("scanner").classList.add("hidden");

  findProduct(scannedBarcode, (found) => {
    if (found) {
      alert("Produit trouvé : " + found.name);
    } else {
      openForm(scannedBarcode);
    }
  });
}

/* =========================
   FORM (OPTION C)
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
async function saveNewProduct() {
  const product = {
    name: document.getElementById("pName").value,
    barcode: normalizeBarcode(document.getElementById("pBarcode").value),
    buy: Number(document.getElementById("pBuy").value) || 0,
    sell: Number(document.getElementById("pSell").value) || 0,
    qty: Number(document.getElementById("pQty").value) || 0
  };

  await saveProduct(product);

  closeForm();
  loadProducts();
}

/* =========================
   EXPORT EXCEL
========================= */
function exportExcel() {
  const ws = XLSX.utils.json_to_sheet(products);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Stock");

  XLSX.writeFile(wb, "stock_export.xlsx");
}
