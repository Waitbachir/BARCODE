let db;
let currentProduct = null;
let products = [];

/* =========================
   INIT DB
========================= */
const req = indexedDB.open("StockDB", 1);

req.onupgradeneeded = e=>{
  db = e.target.result;
  db.createObjectStore("products",{keyPath:"barcode"});
};

req.onsuccess = e=>{
  db = e.target.result;
  loadProducts();
};

/* =========================
   NORMALIZE
========================= */
function norm(v){
  return String(v||"").trim().toLowerCase();
}

/* =========================
   LOAD
========================= */
function loadProducts(){
  const tx = db.transaction("products","readonly");
  const store = tx.objectStore("products");

  const r = store.getAll();

  r.onsuccess=()=>{
    products = r.result || [];
    updateDashboard();
  };
}

/* =========================
   DASHBOARD CALC
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

  document.getElementById("totalProducts").innerText = products.length;
  document.getElementById("totalQty").innerText = totalQty;
  document.getElementById("totalBuy").innerText = totalBuy.toFixed(2)+" DA";
  document.getElementById("totalSell").innerText = totalSell.toFixed(2)+" DA";
}

/* =========================
   SAVE
========================= */
function save(p){
  const tx = db.transaction("products","readwrite");
  tx.objectStore("products").put(p);
}

/* =========================
   SEARCH
========================= */
function search(){
  const val = norm(document.getElementById("searchInput").value);

  const tx = db.transaction("products","readonly");
  const store = tx.objectStore("products");

  const r = store.getAll();

  r.onsuccess=()=>{
    const found = r.result.find(p =>
      norm(p.barcode)===val ||
      norm(p.name).includes(val)
    );

    if(found){
      openEdit(found);
    }else{
      alert("Produit introuvable");
    }
  };
}

/* =========================
   EDIT
========================= */
function openEdit(p){
  currentProduct = p;

  document.getElementById("editModal").classList.remove("hidden");

  eName.value = p.name;
  eBarcode.value = p.barcode;
  eBuy.value = p.buy;
  eSell.value = p.sell;
  eQty.value = p.qty;
}

function closeEdit(){
  document.getElementById("editModal").classList.add("hidden");
}

/* =========================
   SAVE EDIT
========================= */
function saveEdit(){
  const p = {
    name:eName.value,
    barcode:eBarcode.value,
    buy:Number(eBuy.value),
    sell:Number(eSell.value),
    qty:Number(eQty.value)
  };

  save(p);
  closeEdit();
  loadProducts();
}

/* =========================
   SCANNER
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
      readers:["ean_reader","ean_8_reader","code_128_reader"]
    },
    locate:true
  },err=>{
    if(err) return console.log(err);
    Quagga.start();
  });

  Quagga.offDetected();

  Quagga.onDetected(data=>{
    const code = norm(data.codeResult.code);

    Quagga.stop();
    scanner.classList.add("hidden");

    const found = products.find(p=>norm(p.barcode)===code);

    if(found) openEdit(found);
    else alert("Produit introuvable");
  });
}

/* =========================
   IMPORT EXCEL
========================= */
excel.addEventListener("change",e=>{
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload=evt=>{
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

  XLSX.utils.book_append_sheet(wb,ws,"Stock");

  XLSX.writeFile(wb,"stock.xlsx");
}
