// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const { parseStringPromise } = require('xml2js');
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const cors = require('cors');
const ChartJSNodeCanvas = require('chartjs-node-canvas').ChartJSNodeCanvas;
const ChartDataLabels = require('chartjs-plugin-datalabels');
require('dotenv').config();

const app = express();
app.use(cors()); 
app.use(bodyParser.json());

// Conectare MongoDB
mongoose.connect(process.env.MONGO_URI, { 
  dbName: 'egovPermis' })
  .then(() => console.log("Conectat la MongoDB Atlas"))
  .catch(err => console.error("Eroare MongoDB:", err));

// Schema MongoDB
const cerereSchema = new mongoose.Schema({
  nume: String,
  telefon: String,
  email: String,
  cnp: String,
  tipPermis: String,
  categorie: String,
  motivSolicitare: String,
  dataExaminarii: String,
  centruExaminare: String,
  taxa: Number,
  tva: Number,
  total: Number,
  dataTrimitere: { type: Date, default: Date.now },
  pdfFile: String,
  xmlRaw: String
});
const Cerere = mongoose.model('Cerere', cerereSchema);

// Folder PDF
const pdfFolder = path.join(__dirname, 'pdfs');
if (!fs.existsSync(pdfFolder)) fs.mkdirSync(pdfFolder);
app.use('/pdfs', express.static(pdfFolder));

// === Endpoint submitForm ===
app.post('/submitForm', async (req, res) => {
  try {
    const { xml } = req.body;
    if (!xml) throw new Error("Lipsă XML!");

    const data = await parseStringPromise(xml, { explicitArray: false });
    const d = data.cererePermis;

    // Validare câmpuri necesare
    if (!d.nume || !d.telefon || !d.cnp || !d.email || !d.tipPermis || !d.categorie || !d.motivSolicitare) {
      throw new Error("Date incomplete!");
    }

    const pdfFileName = `ordin-${Date.now()}.pdf`;
    const pdfPath = path.join(pdfFolder, pdfFileName);

    // Generare PDF
    await new Promise((resolve, reject) => {
      const pdf = new PDFDocument({ size: "A4", margin: 50 });
      const pdfStream = fs.createWriteStream(pdfPath);
      pdf.pipe(pdfStream);

      pdf.fontSize(20)
        .fillColor("#23408e")
        .font("Helvetica-Bold")
        .text("ORDIN DE PLATA - PERMIS AUTO", { align: "center" })
        .moveDown(2);

      pdf.fontSize(12).fillColor("black").font("Helvetica-Bold")
        .text("Date solicitant", { underline: true }).moveDown(0.5);

      pdf.font("Helvetica")
        .text(`Nume solicitant: ${d.nume}`)
        .text(`Telefon: ${d.telefon}`)
        .text(`Email: ${d.email}`)
        .text(`CNP: ${d.cnp}`).moveDown(1);

      pdf.font("Helvetica-Bold").text("Date permis", { underline: true }).moveDown(0.5);
      pdf.font("Helvetica")
        .text(`Tip permis: ${d.tipPermis}`)
        .text(`Categorie: ${d.categorie}`)
        .text(`Motiv solicitare: ${d.motivSolicitare}`)
        .text(`Data examinarii: ${d.dataExaminarii || "—"}`)
        .text(`Centru examinare: ${d.centruExaminare || "—"}`).moveDown(1);

      pdf.font("Helvetica-Bold").text("Detalii plata", { underline: true }).moveDown(0.5);
      pdf.font("Helvetica")
        .text(`Taxa permis: ${d.taxa} RON`)
        .text(`TVA (21%): ${d.tva} RON`)
        .font("Helvetica-Bold")
        .text(`TOTAL DE PLATA: ${d.total} RON`).moveDown(1);

      pdf.moveTo(50, pdf.y).lineTo(550, pdf.y).strokeColor("#cccccc").lineWidth(0.5).stroke().moveDown(1);

      pdf.font("Helvetica").fillColor("black")
        .text(`Data emiterii: ${new Date().toLocaleString()}`);

      pdf.end();
      pdfStream.on("finish", resolve);
      pdfStream.on("error", reject);
    });

    // Salvare în MongoDB
    const cerereNoua = new Cerere({
      nume: d.nume,
      telefon: d.telefon,
      email: d.email,
      cnp: d.cnp,
      tipPermis: d.tipPermis,
      categorie: d.categorie,
      motivSolicitare: d.motivSolicitare,
      dataExaminarii: d.dataExaminarii,
      centruExaminare: d.centruExaminare,
      taxa: Number(d.taxa),
      tva: Number(d.tva),
      total: Number(d.total),
      pdfFile: `/pdfs/${pdfFileName}`,
      xmlRaw: xml
    });

    await cerereNoua.save();
    res.json({ status: 'ok', pdfUrl: cerereNoua.pdfFile });

  } catch (err) {
    console.error("Eroare:", err);
    res.status(400).json({ status: 'error', error: err.message });
  }
});

// === Endpoint: Date raport simplu ===
app.get("/getRaportData", async (req, res) => {
  try {
    const cereri = await Cerere.find();
    if (!cereri.length) return res.json({ countTipPermis: {}, countCategorie: {}, totalCereri: 0 });

    const countTipPermis = {};
    const countCategorie = {};

    cereri.forEach(c => {
      countTipPermis[c.tipPermis] = (countTipPermis[c.tipPermis] || 0) + 1;
      countCategorie[c.categorie] = (countCategorie[c.categorie] || 0) + 1;
    });

    res.json({ countTipPermis, countCategorie, totalCereri: cereri.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// === Endpoint: Statistici pentru frontend ===
app.get("/api/statistici", async (req, res) => {
  const cereri = await Cerere.find();

  const totalCereri = cereri.length;

  const totalIncasari = cereri.reduce((sum, c) => sum + (c.total || 0), 0);

  const mediaTaxa = totalCereri > 0 ? totalIncasari / totalCereri : 0;

  const tipPermis = {};
  const categorie = {};
  const motive = {};
  const centre = {};

  // lunile 1-12
  const luni = new Array(12).fill(0);

  cereri.forEach(c => {
    tipPermis[c.tipPermis] = (tipPermis[c.tipPermis] || 0) + 1;
    categorie[c.categorie] = (categorie[c.categorie] || 0) + 1;
    motive[c.motivSolicitare] = (motive[c.motivSolicitare] || 0) + 1;
    centre[c.centruExaminare] = (centre[c.centruExaminare] || 0) + 1;

    if (c.dataTrimitere) {
      const luna = new Date(c.dataTrimitere).getMonth(); // 0-11
      luni[luna]++;
    }
  });

  res.json({
    totalCereri,
    totalIncasari,
    mediaTaxa,
    tipPermis,
    categorie,
    motive,
    centre,
    luni
  });
});


// === Endpoint generateRaport ===
app.get("/generateRaport", async (req, res) => {
  try {
    const cereri = await Cerere.find();
    if (!cereri.length) return res.json({ status: "error", error: "Nu există date în baza de date." });

    // === 1. Analiză date ===
    const countTipPermis = {};
    const countCategorie = {};
    let totalTaxe = 0;
    let totalTVA = 0;
    let totalIncasari = 0;

    cereri.forEach(c => {
      countTipPermis[c.tipPermis] = (countTipPermis[c.tipPermis] || 0) + 1;
      countCategorie[c.categorie] = (countCategorie[c.categorie] || 0) + 1;
      totalTaxe += c.taxa || 0;
      totalTVA += c.tva || 0;
      totalIncasari += c.total || 0;
    });

    const totalCereri = cereri.length;

    // === 2. ChartJS Node Canvas (FĂRĂ DATALABELS) ===
    const width = 600;
    const height = 400;
    const chartMaker = new ChartJSNodeCanvas({
      width,
      height,
      chartCallback: (ChartJS) => {
        // Plugin custom pentru adăugare procente pe grafic
       ChartJS.register({
          id: "piePercentLabels",
          afterDraw(chart) {
            if (chart.config.type !== "pie") return;

            const { ctx } = chart;

            const dataset = chart.data.datasets[0];
            const meta = chart.getDatasetMeta(0);

            const total = dataset.data.reduce((a, b) => a + b, 0);

            meta.data.forEach((element, index) => {
              const value = dataset.data[index];
              const percent = ((value / total) * 100).toFixed(1) + "%";

              // Coordonate centrul segmentului
              const model = element;
              const startAngle = model.startAngle;
              const endAngle = model.endAngle;
              const midAngle = (startAngle + endAngle) / 2;

              // poziție radială
              const x = model.x + Math.cos(midAngle) * (model.outerRadius * 0.65);
              const y = model.y + Math.sin(midAngle) * (model.outerRadius * 0.65);

              ctx.save();
              ctx.fillStyle = "white"; // se vede pe orice culoare
              ctx.font = "bold 14px Arial";
              ctx.textAlign = "center";
              ctx.fillText(percent, x, y);
              ctx.restore();
            });
          }
        });

        ChartJS.register({
          id: "barPercentLabels",
          afterDraw(chart) {
            if (chart.config.type !== "bar") return;

            const ctx = chart.ctx;
            const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);

            chart.data.datasets.forEach((dataset, i) => {
              const meta = chart.getDatasetMeta(i);
              meta.data.forEach((bar, index) => {
                const value = dataset.data[index];
                const percent = ((value / total) * 100).toFixed(1) + "%";

                ctx.save();
                ctx.fillStyle = "black";
                ctx.font = "bold 14px Arial";
                ctx.textAlign = "center";
                ctx.fillText(percent, bar.x, bar.y - 10);
                ctx.restore();
              });
            });
          }
        });
      },
    });

    // === 3. Bar chart cu procente ===
    const chart1 = await chartMaker.renderToBuffer({
      type: 'bar',
      data: {
        labels: Object.keys(countTipPermis),
        datasets: [{
          label: 'Numar cereri pe tip permis',
          data: Object.values(countTipPermis),
          backgroundColor: 'rgba(35,64,142,0.7)',
          borderColor: 'rgba(35,64,142,1)',
          borderWidth: 1
        }]
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: context => {
                const pct = ((context.raw / totalCereri) * 100).toFixed(1);
                return `${context.raw} cereri (${pct}%)`;
              }
            }
          }
        },
        scales: { y: { beginAtZero: true } }
      }
    });

    // === 4. Pie chart cu procente ===
    const chart2 = await chartMaker.renderToBuffer({
      type: 'pie',
      data: {
        labels: Object.keys(countCategorie),
        datasets: [{
          data: Object.values(countCategorie),
          backgroundColor: [
            '#23408e', '#ff6384', '#36a2eb', '#ffcd56',
            '#4bc0c0', '#9966ff', '#ff9f40', '#c9cbcf', '#8dd17e'
          ]
        }]
      },
      options: {
        plugins: {
          tooltip: {
            callbacks: {
              label: context => {
                const pct = ((context.raw / totalCereri) * 100).toFixed(1);
                return `${context.label}: ${context.raw} cereri (${pct}%)`;
              }
            }
          }
        }
      }
    });

    // === 5. Generare PDF ===
    const pdfFileName = `raport-${Date.now()}.pdf`;
    const pdfPath = path.join(pdfFolder, pdfFileName);
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    doc.fontSize(24).fillColor('#23408e').text("Raport Statistici Cereri Permis", { align: "center" });
    doc.moveDown(1);

    doc.fontSize(14).fillColor('black').text("Sumar incasari:", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12)
       .text(`Total taxe colectate: ${totalTaxe.toFixed(2)} RON`)
       .text(`Total TVA (21%): ${totalTVA.toFixed(2)} RON`)
       .text(`Total incasari: ${totalIncasari.toFixed(2)} RON`);
    doc.moveDown(1);

    doc.fontSize(14).text("Distributie Tip Permis:", { underline: true });

    const graph1Y = doc.y;

    // afișare grafic stânga
    doc.image(chart1, { width: 300, height: 200, x: 50, y: graph1Y });

    // titlu procente dreapta
    doc.fontSize(12)
      .fillColor('#23408e')
      .font("Helvetica-Bold")
      .text("Procente cereri pe tip permis:", 370, graph1Y);

    // lista procente
    doc.fontSize(10)
      .fillColor("black")
      .font("Helvetica");

    // calcul procente dinamice
    Object.keys(countTipPermis).forEach((tip, i) => {
      const val = countTipPermis[tip];
      const pct = ((val / totalCereri) * 100).toFixed(1);
      doc.text(`- ${tip}: ${pct}% (${val} cereri)`, 370);
    });
    
    const graphHeight = 200;
    const margin = 20; // spațiu între grafic și secțiune
    doc.y = graph1Y + graphHeight + margin;

    // === GRAFIC 2 + PROCENTE DREAPTA ===
    doc.x = 50;
    doc.fontSize(14).text("Distributie Categorie Permis:", { underline: true });

    const graph2Y = doc.y;

    // grafic stanga
    doc.image(chart2, { width: 300, height: 200, x: 50, y: graph2Y });

    // titlu dreapta
    doc.fontSize(12)
      .fillColor('#23408e')
      .font("Helvetica-Bold")
      .text("Procente cereri pe categorie:", 370, graph2Y);

    // listă procente
    doc.fontSize(10)
      .fillColor("black")
      .font("Helvetica");

    Object.keys(countCategorie).forEach((cat) => {
      const val = countCategorie[cat];
      const pct = ((val / totalCereri) * 100).toFixed(1);
      doc.text(`- ${cat}: ${pct}% (${val} cereri)`, 370);
    });

    doc.y = graph2Y + graphHeight + margin;

   const footerY = doc.y + 10; // 10px sub ultimul text/grafic
   doc.fontSize(10)
      .fillColor("gray")
      .text(`Generat la: ${new Date().toLocaleString()}`, 50, footerY, { align: "center" });

    doc.end();

    stream.on("finish", () => {
      res.json({ status: "ok", pdfUrl: `/pdfs/${pdfFileName}` });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", error: err.message });
  }
});
  app.get("/api/statistici", async (req, res) => {
  try {
    const cereri = await Cerere.find();

    const countTipPermis = {};
    const countCategorie = {};

    cereri.forEach(c => {
      countTipPermis[c.tipPermis] = (countTipPermis[c.tipPermis] || 0) + 1;
      countCategorie[c.categorie] = (countCategorie[c.categorie] || 0) + 1;
    });

    res.json({
      totalCereri: cereri.length,
      tipPermis: countTipPermis,
      categorie: countCategorie
    });

  } catch (err) {
    res.status(500).json({ error: "Eroare extragere statistici" });
  }
});


// --- Pornire server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server pornit pe http://localhost:${PORT}`));
