let db;
let products = [];

/* =========================
   NORMALISATION
========================= */
function norm(v){
  return String(v || "").trim().toLowerCase();
}

/* =========================
   INIT IndexedDB
========================= */
const request = indexedDB.open("StockDB", 1);

request.onupgradeneeded = function(e){
  db = e.target.result;

  const store = db.createObjectStore("products", {
    keyPath: "barcode"
  });

  store.createIndex("name", "name", { unique:false });
};

request.onsuccess = function(e){
  db = e.target.result;
  loadProducts();
};

request.onerror = function(){
  console.error("Erreur IndexedDB");
};

/* =========================
   LOAD PRODUCTS
========================= */
function loadProducts(){
  const tx = db.transaction("products","readonly");
  const store = tx.objectStore("products");

  const req = store.getAll();

  req.onsuccess = ()=>{
    products = req.result || [];
    updateDashboard();
  };
}

/* =========================
   SAVE PRODUCT
========================= */
function save(p){
  const tx = db.transaction("products","readwrite");
  tx.objectStore("products").put(p);
}

/* =========================
   DASHBOARD
========================= */
function updateDashboard(){

  let totalQty = 0;
  let totalBuy = 0;
  let totalSell = 0;

  products.forEach(p=>{
    const qty = Number(p.qty)||0;
    const buy = Number(p.buy)||0;
    const sell = Number(p.sell)||0;

    totalQty += qty;
    totalBuy += buy * qty;
    totalSell += sell * qty;
  });

  const set = (id,val)=>{
    const el = document.getElementById(id);
    if(el) el.innerText = val;
  };

  set("totalProducts", products.length);
  set("totalQty", totalQty);
  set("totalBuy", totalBuy.toFixed(2) + " DA");
  set("totalSell", totalSell.toFixed(2) + " DA");
}

/* =========================
   SEARCH (IMPORTANT LOGIC)
========================= */
function search(){

  const val = norm(document.getElementById("searchInput").value);

  if(!val){
    alert("Champ vide");
    return;
  }

  const tx = db.transaction("products","readonly");
  const store = tx.objectStore("products");

  const req = store.getAll();

  req.onsuccess = ()=>{

    const found = req.result.find(p =>
      norm(p.barcode) === val ||
      norm(p.name).includes(val)
    );

    if(found){
      openEdit(found);
    }else{
      openCreate(val); // 👉 création automatique
    }
  };
}

/* =========================
   EDIT PRODUCT
========================= */
function openEdit(p){
  currentProduct = p;

  editModal.classList.remove("hidden");

  eName.value = p.name;
  eBarcode.value = p.barcode;
  eBuy.value = p.buy;
  eSell.value = p.sell;
  eQty.value = p.qty;
}

function closeEdit(){
  editModal.classList.add("hidden");
}

function saveEdit(){

  const p = {
    name: eName.value,
    barcode: eBarcode.value,
    buy: Number(eBuy.value),
    sell: Number(eSell.value),
    qty: Number(eQty.value)
  };

  save(p);
  closeEdit();
  loadProducts();
}

/* =========================
   CREATE PRODUCT
========================= */
function openCreate(barcode){
  createModal.classList.remove("hidden");

  cBarcode.value = barcode;
  cName.value = "";
  cBuy.value = "";
  cSell.value = "";
  cQty.value = "";
}

function closeCreate(){
  createModal.classList.add("hidden");
}

function saveNew(){

  const p = {
    name: cName.value,
    barcode: cBarcode.value,
    buy: Number(cBuy.value) || 0,
    sell: Number(cSell.value) || 0,
    qty: Number(cQty.value) || 0
  };

  save(p);

  closeCreate();
  loadProducts();
}

/* =========================
   SCANNER (CAMERA FIX)
========================= */
function startScan(){

  scanner.classList.remove("hidden");

  Quagga.init({
    inputStream:{
      type:"LiveStream",
      target:document.querySelector("#scanner"),
      constraints:{
        facingMode:"environment",
        width:1280,
        height:720
      }
    },
    decoder:{
      readers:[
        "ean_reader",
        "ean_8_reader",
        "code_128_reader"
      ]
    },
    locate:true
  },err=>{
    if(err){
      console.log(err);
      return;
    }
    Quagga.start();
  });

  Quagga.offDetected();

  Quagga.onDetected(data=>{

    const code = norm(data.codeResult.code);

    Quagga.stop();
    scanner.classList.add("hidden");

    const found = products.find(p =>
      norm(p.barcode) === code
    );

    if(found){
      openEdit(found);
    }else{
      openCreate(code); // 👉 création directe scan
    }
  });
}

/* =========================
   IMPORT EXCEL
========================= */
excel.addEventListener("change", e=>{

  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = evt=>{

    const data = new Uint8Array(evt.target.result);
    const wb = XLSX.read(data,{type:"array"});
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    json.forEach(x=>{
      save({
        name:x.Nom,
        barcode:norm(x["Code-barres"]),
        buy:Number(x["Coût"])||0,
        sell:Number(x["Prix de vente"])||0,
        qty:Number(x["Quantité disponible"])||0
      });
    });

    loadProducts();
  };

  reader.readAsArrayBuffer(file);
});

/* =========================
   EXPORT EXCEL
========================= */
function exportExcel(){

  const ws = XLSX.utils.json_to_sheet(products);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Stock");

  XLSX.writeFile(wb, "stock.xlsx");
}
