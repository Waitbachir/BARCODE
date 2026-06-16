let db;
let scannedBarcode = null;
let products = [];

/* =========================
   IndexedDB INIT
========================= */
const request = indexedDB.open("StockDB", 1);

request.onupgradeneeded = function(e) {
  db = e.target.result;
  db.createObjectStore("products", { keyPath: "barcode" });
};

request.onsuccess = function(e) {
  db = e.target.result;
  loadProducts();
};

/* =========================
   LOAD PRODUCTS
========================= */
function loadProducts() {
  const tx = db.transaction("products", "readonly");
  const store = tx.objectStore("products");

  const req = store.getAll();

  req.onsuccess = () => {
    products = req.result;
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
      <div class="product">
        <b>${p.name}</b><br>
        Code: ${p.barcode}<br>
        Prix: ${p.sell} DA<br>
        Stock: ${p.qty}
      </div>
    `;
  });
}

/* =========================
   IMPORT EXCEL
========================= */
document.getElementById("excelFile").addEventListener("change", function(e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function(evt) {
    const data = new Uint8Array(evt.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    json.forEach(item => {
      saveProduct({
        name: item.Nom,
        barcode: item["Code-barres"],
        buy: item["Coût"],
        sell: item["Prix de vente"],
        qty: item["Quantité disponible"]
      });
    });

    loadProducts();
  };

  reader.readAsArrayBuffer(file);
});

/* =========================
   SAVE PRODUCT
========================= */
function saveProduct(p) {
  const tx = db.transaction("products", "readwrite");
  const store = tx.objectStore("products");
  store.put(p);
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
      target: document.querySelector("#scanner")
    },
    decoder: {
      readers: ["ean_reader", "code_128_reader"]
    }
  }, function(err) {
    if (err) return console.log(err);
    Quagga.start();
  });

  Quagga.onDetected(onScan);
}

function onScan(result) {
  scannedBarcode = result.codeResult.code;
  Quagga.stop();
  document.getElementById("scanner").classList.add("hidden");

  const found = products.find(p => p.barcode === scannedBarcode);

  if (found) {
    alert("Produit trouvé: " + found.name);
  } else {
    openForm(scannedBarcode);
  }
}

/* =========================
   FORM PRODUIT
========================= */
function openForm(barcode) {
  document.getElementById("productForm").classList.remove("hidden");
  document.getElementById("pBarcode").value = barcode;
}

function closeForm() {
  document.getElementById("productForm").classList.add("hidden");
}

/* =========================
   SAVE NEW PRODUCT (Option C)
========================= */
function saveNewProduct() {
  const p = {
    name: document.getElementById("pName").value,
    barcode: document.getElementById("pBarcode").value,
    buy: document.getElementById("pBuy").value,
    sell: document.getElementById("pSell").value,
    qty: document.getElementById("pQty").value
  };

  saveProduct(p);
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
