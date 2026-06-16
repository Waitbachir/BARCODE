let db;
let currentProduct = null;

/* =========================
   INIT DB
========================= */
const req = indexedDB.open("StockDB", 1);

req.onupgradeneeded = e => {
  db = e.target.result;
  const store = db.createObjectStore("products", { keyPath: "barcode" });
};

req.onsuccess = e => {
  db = e.target.result;
};

/* =========================
   NORMALIZE
========================= */
function norm(v){
  return String(v || "").trim().toLowerCase();
}

/* =========================
   SAVE
========================= */
function save(p){
  const tx = db.transaction("products","readwrite");
  tx.objectStore("products").put(p);
}

/* =========================
   GET PRODUCT (DB DIRECT)
========================= */
function getProduct(key, cb){
  const tx = db.transaction("products","readonly");
  const req = tx.objectStore("products").get(key);

  req.onsuccess = ()=> cb(req.result);
}

/* =========================
   SEARCH (FIXED)
========================= */
function search(){
  const val = norm(document.getElementById("searchInput").value);

  const tx = db.transaction("products","readonly");
  const store = tx.objectStore("products");

  const req = store.getAll();

  req.onsuccess = ()=>{
    const res = req.result;

    const found = res.find(p =>
      norm(p.barcode) === val ||
      norm(p.name).includes(val)
    );

    if(found){
      openEdit(found);
    } else {
      alert("Produit introuvable");
    }
  };
}

/* =========================
   DISPLAY EDIT
========================= */
function openEdit(p){
  currentProduct = p;

  document.getElementById("editModal").classList.remove("hidden");

  document.getElementById("eName").value = p.name;
  document.getElementById("eBarcode").value = p.barcode;
  document.getElementById("eBuy").value = p.buy || 0;
  document.getElementById("eSell").value = p.sell || 0;
  document.getElementById("eQty").value = p.qty || 0;
}

function closeEdit(){
  document.getElementById("editModal").classList.add("hidden");
}

/* =========================
   SAVE EDIT
========================= */
function saveEdit(){
  const p = {
    name: document.getElementById("eName").value,
    barcode: document.getElementById("eBarcode").value,
    buy: Number(document.getElementById("eBuy").value),
    sell: Number(document.getElementById("eSell").value),
    qty: Number(document.getElementById("eQty").value)
  };

  save(p);
  closeEdit();
}

/* =========================
   SCANNER (IMPROVED)
========================= */
function startScan(){
  document.getElementById("scanner").classList.remove("hidden");

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
  }, err=>{
    if(err) console.log(err);
    Quagga.start();
  });

  Quagga.offDetected();
  Quagga.onDetected(data=>{
    const code = norm(data.codeResult.code);

    Quagga.stop();
    document.getElementById("scanner").classList.add("hidden");

    getProduct(code, p=>{
      if(p){
        openEdit(p);
      }else{
        alert("Produit introuvable");
      }
    });
  });
}

/* =========================
   IMPORT EXCEL
========================= */
document.getElementById("excel").addEventListener("change", e=>{
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

    alert("Import terminé");
  };

  reader.readAsArrayBuffer(file);
});
