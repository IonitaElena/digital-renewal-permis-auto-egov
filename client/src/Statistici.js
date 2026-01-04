import React, { useEffect, useState } from "react";
import axios from "axios";
import { Bar, Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  ArcElement,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Legend,
  Tooltip,
} from "chart.js";

ChartJS.register(
  BarElement,
  ArcElement,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Legend,
  Tooltip
);

export default function Statistici() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    axios.get("http://localhost:5000/api/statistici")
      .then(res => setStats(res.data))
      .catch(err => console.error(err));
  }, []);

  if (!stats) return <p style={{ padding: 20 }}>Se încarcă...</p>;

  const cardStyle = {
    background: "white",
    padding: "25px",
    borderRadius: "14px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    flex: 1,
    textAlign: "center"
  };

  const containerStyle = {
    padding: "40px",
    maxWidth: "1000px",
    margin: "auto",
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
    gap: "40px",
    marginTop: "35px",
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ marginBottom: 30 }}>Statistici Cereri Permis</h1>

      {/* KPI CARDS */}
      <div style={{ display: "flex", gap: "30px" }}>
        <div style={cardStyle}>
          <h2>{stats.totalCereri}</h2>
          <p>Total cereri</p>
        </div>

        <div style={cardStyle}>
      <h2>{(stats.totalIncasari ?? 0).toFixed(2)} RON</h2>
          <p>Total încasări</p>
        </div>

        <div style={cardStyle}>
         <h2>{(stats.mediaTaxa ?? 0).toFixed(2)} RON</h2>
          <p>Media taxei</p>
        </div>
      </div>

      {/* GRAFICE */}
      <div style={gridStyle}>
        
        {/* Tip permis */}
        <div style={cardStyle}>
          <h3>Distribuție Tip Permis</h3>
          <Bar
            data={{
              labels: Object.keys(stats.tipPermis),
              datasets: [{
                label: "Număr cereri",
                data: Object.values(stats.tipPermis),
                backgroundColor: "rgba(54, 162, 235, 0.6)",
              }]
            }}
          />
        </div>

        {/* Categorie */}
        <div style={cardStyle}>
          <h3>Distribuție Categorie</h3>
          <Pie
            data={{
              labels: Object.keys(stats.categorie),
              datasets: [{
                data: Object.values(stats.categorie),
                backgroundColor: [
                  "rgba(255, 99, 132, 0.6)",
                  "rgba(54, 162, 235, 0.6)",
                  "rgba(255, 206, 86, 0.6)",
                  "rgba(218, 133, 30, 0.6)",
                  "rgba(141, 209, 126, 0.6)",
                  "rgba(153, 102, 255, 0.6)",
                  "rgba(255, 159, 64, 0.6)",
                  "rgba(201, 203, 207, 0.6)",
                  "rgba(192, 75, 155, 0.6)",
                ],
              }]
            }}
          />
        </div>

        {/* Centre examinare */}
        <div style={cardStyle}>
          <h3>Top Centre Examinare</h3>
          <Bar
            data={{
              labels: Object.keys(stats.centre),
              datasets: [{
                label: "Număr candidați",
                data: Object.values(stats.centre),
                backgroundColor: "rgba(153, 102, 255, 0.6)",
              }]
            }}
          />
        </div>

        {/* Motive solicitare */}
        <div style={cardStyle}>
          <h3>Motiv Solicitare</h3>
          <Pie
            data={{
              labels: Object.keys(stats.motive),
              datasets: [{
                data: Object.values(stats.motive),
                backgroundColor: [
                  "rgba(255, 159, 64, 0.6)",
                  "rgba(75, 192, 192, 0.6)",
                  "rgba(255, 99, 132, 0.6)",
                  "rgba(54, 162, 235, 0.6)",
                ],
              }]
            }}
          />
        </div>

        {/* Cereri pe luni */}
        <div style={cardStyle}>
          <h3>Cereri în ultimele 12 luni</h3>
          <Line
            data={{
              labels: [
                "Ian", "Feb", "Mar", "Apr", "Mai", "Iun",
                "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"
              ],
              datasets: [{
                label: "Cereri",
                data: stats.luni,
                borderColor: "rgba(54, 162, 235, 1)",
                backgroundColor: "rgba(54, 162, 235, 0.4)",
              }]
            }}
          />
        </div>

      </div>
    </div>
  );
}
