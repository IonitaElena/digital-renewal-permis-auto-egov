import React, { useState, useEffect, useMemo } from "react";
import "./App.css";
import { Routes, Route, Link } from "react-router-dom";
import Statistici from "./Statistici";

function Formular() {
  const [form, setForm] = useState({
    nume: "",
    telefon: "",
    email: "",
    cnp: "",
    tipPermis: "",
    categorie: "",
    motivSolicitare: "",
    dataExaminarii: "",
    centruExaminare: "",
    taxa: 0,
    tva: 0,
    total: 0,
  });

  const [categorii, setCategorii] = useState([]);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [pdfUrl, setPdfUrl] = useState("");

  const costuri = useMemo(() => ({
    auto: { B: 90, BE: 110, C: 130, CE: 150 },
    moto: { A1: 50, A2: 60, A: 80 },
    profesional: { D: 170, DE: 200 },
  }), []);

  // Actualizare categorii când se schimbă tip permis
  useEffect(() => {
    if (form.tipPermis && costuri[form.tipPermis]) {
      setCategorii(Object.keys(costuri[form.tipPermis]));
    } else {
      setCategorii([]);
    }
    setForm(f => ({ ...f, categorie: "", taxa: 0, tva: 0, total: 0 }));
  }, [form.tipPermis, costuri]);

  // Calculeaza automat TVA si totalul in functie de categoria selectata

  useEffect(() => {
    const tip = form.tipPermis;
    const cat = form.categorie;
    if (tip && cat && costuri[tip] && costuri[tip][cat]) {
      const taxa = costuri[tip][cat];
      const tva = +(taxa * 0.21).toFixed(2);
      const total = +(taxa + tva).toFixed(2);
      setForm(f => ({ ...f, taxa, tva, total }));
    }
  }, [form.tipPermis, form.categorie, costuri]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setForm(f => ({ ...f, [id]: value }));
  };

  //onst validCNP = (cnp) => /^[0-9]{13}$/.test(cnp);

  const handleSubmit = async () => {
    const requiredFields = ["nume","telefon","email","cnp","tipPermis","categorie","motivSolicitare"];
    for (let field of requiredFields) {
      if (!form[field]) {
        setMsg({ text: `Completați corect toate câmpurile! Lipsește: ${field}`, type: "error" });
        return;
      }
    }

    // Creare document XML care va fi trimis la server
    const xml = `
    <cererePermis>
      <nume>${form.nume}</nume>
      <telefon>${form.telefon}</telefon>
      <email>${form.email}</email>
      <cnp>${form.cnp}</cnp>
      <tipPermis>${form.tipPermis}</tipPermis>
      <categorie>${form.categorie}</categorie>
      <motivSolicitare>${form.motivSolicitare}</motivSolicitare>
      <dataExaminarii>${form.dataExaminarii}</dataExaminarii>
      <centruExaminare>${form.centruExaminare}</centruExaminare>
      <taxa>${form.taxa}</taxa>
      <tva>${form.tva}</tva>
      <total>${form.total}</total>
    </cererePermis>`;

    setMsg({ text: "Se trimite cererea...", type: "info" });
    setPdfUrl("");

    // Trimite cererea la endpointul /submitForm din backend
    try {
      const resp = await fetch("/submitForm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xml }),
      });

      const text = await resp.text();
      let data;
      try { data = JSON.parse(text); } 
      catch { 
        setMsg({ text: "Server a returnat răspuns invalid: " + text, type: "error" }); 
        return; 
      }

      if (data.status === "ok") {
        setMsg({ text: "Cererea a fost transmisă cu succes!", type: "success" });
        setPdfUrl(`http://localhost:5000${data.pdfUrl}`);
      } else {
        setMsg({ text: "Eroare server: " + (data.error || "necunoscută"), type: "error" });
      }
    } catch (err) {
      setMsg({ text: "Eroare de rețea!", type: "error" });
    }
  };

  // Interfata grafica a formularului
  return (
    <div className="form-container">
      <h1>Formular electronic – Reînnoire permis auto</h1>
      <form onSubmit={e => e.preventDefault()}>
        <fieldset>
          <legend>Date personale</legend>
          <label>Nume și prenume:</label>
          <input id="nume" value={form.nume} onChange={handleChange} required />

          <label>Telefon:</label>
          <input id="telefon" value={form.telefon} onChange={handleChange} required />

          <label>Email:</label>
          <input id="email" type="email" value={form.email} onChange={handleChange} required />

          <label>CNP:</label>
          <input id="cnp" value={form.cnp} onChange={handleChange} pattern="[0-9]{13}" required />

        </fieldset>

        <fieldset>
          <legend>Date permis</legend>
          <label>Tip permis:</label>
          <select id="tipPermis" value={form.tipPermis} onChange={handleChange} required>
            <option value="">– Selectați –</option>
            <option value="auto">Auto</option>
            <option value="moto">Moto</option>
            <option value="profesional">Profesional</option>
          </select>

          <label>Categorie:</label>
          <select id="categorie" value={form.categorie} onChange={handleChange} required disabled={categorii.length===0}>
            <option value="">– Selectați –</option>
            {categorii.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>

          <label>Motiv solicitare:</label>
          <select id="motivSolicitare" value={form.motivSolicitare} onChange={handleChange} required>
            <option value="">– Selectați –</option>
            <option value="Reînnoire">Reînnoire</option>
            <option value="Pierdere">Pierdere</option>
            <option value="Schimbare nume">Schimbare nume</option>
          </select>

          <label>Data examinării:</label>
          <input id="dataExaminarii" type="date" value={form.dataExaminarii} onChange={handleChange} />

          <label>Centru examinare:</label>
          <select
            id="centruExaminare"
            value={form.centruExaminare}
            onChange={handleChange}
          >
            <option value="">– Selectați –</option>
            <option value="Alba">Alba</option>
            <option value="Arad">Arad</option>
            <option value="Arges">Arges</option>
            <option value="Bacau">Bacau</option>
            <option value="Bihor">Bihor</option>
            <option value="Bistrita-Nasaud">Bistrita-Nasaud</option>
            <option value="Botosani">Botosani</option>
            <option value="Brasov">Brasov</option>
            <option value="Braila">Braila</option>
            <option value="Bucuresti">Bucuresti</option>
            <option value="Buzau">Buzau</option>
            <option value="Caras-Severin">Caras-Severin</option>
            <option value="Calarasi">Calarasi</option>
            <option value="Cluj">Cluj</option>
            <option value="Constanta">Constanta</option>
            <option value="Covasna">Covasna</option>
            <option value="Dambovita">Dambovita</option>
            <option value="Dolj">Dolj</option>
            <option value="Galati">Galati</option>
            <option value="Giurgiu">Giurgiu</option>
            <option value="Gorj">Gorj</option>
            <option value="Harghita">Harghita</option>
            <option value="Hunedoara">Hunedoara</option>
            <option value="Ialomita">Ialomita</option>
            <option value="Iasi">Iasi</option>
            <option value="Ilfov">Ilfov</option>
            <option value="Maramures">Maramures</option>
            <option value="Mehedinti">Mehedinti</option>
            <option value="Mures">Mures</option>
            <option value="Neamt">Neamt</option>
            <option value="Olt">Olt</option>
            <option value="Prahova">Prahova</option>
            <option value="Satu Mare">Satu Mare</option>
            <option value="Salaj">Salaj</option>
            <option value="Sibiu">Sibiu</option>
            <option value="Suceava">Suceava</option>
            <option value="Teleorman">Teleorman</option>
            <option value="Timis">Timis</option>
            <option value="Tulcea">Tulcea</option>
            <option value="Vaslui">Vaslui</option>
            <option value="Valcea">Valcea</option>
            <option value="Vrancea">Vrancea</option>
          </select>

          <label>Taxă bază (RON):</label>
          <input id="taxa" type="number" value={form.taxa} readOnly />

          <label>TVA (21%):</label>
          <input id="tva" type="number" value={form.tva} readOnly />

          <label>Total de plată:</label>
          <input id="total" type="number" value={form.total} readOnly />
        </fieldset>

        <button type="button" onClick={handleSubmit}>Trimite cererea</button>
      </form>
      
      {msg.text && <p className={`msg ${msg.type}`}>{msg.text}</p>}
      {pdfUrl && <p><a href={pdfUrl} target="_blank" rel="noreferrer">Descarcă ordinul de plată (PDF)</a></p>}
     
      <div style={{ textAlign: "center", marginTop: 20 }}>
        <Link to="/statistici">
          Vezi statistici
        </Link>
      </div>

      <button
        style={{ marginTop: "10px" }}
        onClick={async () => {
          try {
            const resp = await fetch("http://localhost:5000/generateRaport");
            const data = await resp.json();
            if (data.status === "ok") {
              window.open("http://localhost:5000" + data.pdfUrl, "_blank");
            } else {
              alert("Eroare: " + data.error);
            }
          } catch (err) {
            alert("Eroare la conexiunea cu serverul backend!");
            console.error(err);
          }
        }}
      >
        Generează raport statistici
      </button>
    </div>
  );
}

function RootApp() {
  return (
    <Routes>
      <Route path="/" element={<Formular />} />
      <Route path="/statistici" element={<Statistici />} />
    </Routes>
  );
}

export default RootApp;