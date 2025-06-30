const { jsPDF } = window.jspdf;

let currentAnalysis = null;
let localPatterns = null; // will be loaded once at startup

const globalPatterns = [
  { regex: /account (suspended|locked|disabled)/i, score: 3, reason: "Mentions account suspension/lock" },
  { regex: /click here/i, score: 2, reason: "Urgent click request" },
  { regex: /login here/i, score: 2, reason: "Direct login link" },
  { regex: /update your account/i, score: 2, reason: "Prompt to update account" },
  { regex: /verify your (identity|account)/i, score: 2, reason: "Verification scam" },
  { regex: /24 hours/i, score: 1, reason: "Sense of urgency" },
  { regex: /\.ru\b|\.xyz\b|\.pw\b/i, score: 2, reason: "Suspicious domain" },
  { regex: /you(')?ve won/i, score: 2, reason: "Fake prize/lottery" },
  { regex: /unusual login attempt/i, score: 1, reason: "Fake login alert" },
  { regex: /download the attachment/i, score: 2, reason: "Malware delivery" }
];

const analyzeBtn = document.getElementById('analyzeBtn');
const pdfBtn = document.getElementById('pdfReportBtn');
const resultDiv = document.getElementById('result');
const aiExplanationDiv = document.getElementById('aiExplanation');
const loadingDiv = document.getElementById('loading');
const localIntelBadge = document.getElementById('localIntelBadge');
const emailInput = document.getElementById('emailInput');

// Hide results when textarea is cleared
emailInput.addEventListener('input', () => {
  if (emailInput.value.trim() === '') {
    resultDiv.classList.add('hidden');
    aiExplanationDiv.classList.add('hidden');
    pdfBtn.classList.add('hidden');
    pdfBtn.classList.remove('visible');
    localIntelBadge.style.display = 'none';
    currentAnalysis = null;
  }
});

// Load local patterns from JSON (only once, on page load)
async function loadLocalPatternsOnce() {
  if (localPatterns !== null) return;
  try {
    const response = await fetch('local_phishing_patterns.json');
    const data = await response.json();
    localPatterns = data.patterns.map(item => ({
      regex: new RegExp(item.regex, "i"),
      score: item.score,
      reason: item.reason,
      isLocal: true
    }));
  } catch (e) {
    localPatterns = [];
    console.error("Failed to load local phishing patterns.", e);
  }
}

function getAllPatterns() {
  return [
    ...globalPatterns.map(p => ({ ...p, isLocal: false })),
    ...(Array.isArray(localPatterns) ? localPatterns : [])
  ];
}

function scanMessageWithLocalPatterns(message) {
  const allPatterns = getAllPatterns();
  let totalScore = 0;
  let matches = [];
  let localMatches = [];
  for (let i = 0; i < allPatterns.length; i++) {
    const pattern = allPatterns[i];
    if (pattern.regex.test(message)) {
      totalScore += pattern.score;
      matches.push({
        reason: pattern.reason,
        isLocal: pattern.isLocal
      });
      if (pattern.isLocal) localMatches.push(pattern.reason);
    }
  }
  return { totalScore, matches, localMatches };
}

window.addEventListener('DOMContentLoaded', () => {
  loadLocalPatternsOnce();
});

analyzeBtn.addEventListener('click', async () => {
  const input = emailInput.value.trim();
  if (!input) {
    alert('Please paste an email message or link to analyze.');
    return;
  }
  loadingDiv.classList.remove('hidden');
  resultDiv.classList.add('hidden');
  aiExplanationDiv.classList.add('hidden');
  pdfBtn.classList.add('hidden');
  pdfBtn.classList.remove('visible');
  localIntelBadge.style.display = 'none';

  if (localPatterns === null) await loadLocalPatternsOnce();

  const { totalScore, matches, localMatches } = scanMessageWithLocalPatterns(input);

  // Any local scam match (score >= 5) is high risk, even if totalScore<5
  const isLocalHigh = localMatches.length > 0;
  let mlPrediction = (totalScore >= 5 || isLocalHigh) ? "phishing" : (totalScore >= 3 ? "suspicious" : "legitimate");
  let mlConfidence = totalScore > 0 ? Math.min(1, 0.5 + totalScore * 0.1) : 0.3;
  currentAnalysis = {
    totalScore,
    matches,
    localMatches,
    mlPrediction,
    mlConfidence,
    input
  };

  updateResultsUI(currentAnalysis);

  loadingDiv.classList.add('hidden');
  resultDiv.classList.remove('hidden');
  aiExplanationDiv.classList.remove('hidden');
  pdfBtn.classList.remove('hidden');
  pdfBtn.classList.add('visible');
  document.getElementById('mlResults').classList.remove('hidden');
  localIntelBadge.style.display = (localMatches.length > 0) ? 'inline-block' : 'none';
});

function updateResultsUI(analysis) {
  const riskLabel = getRiskLabel(analysis);
  const riskClass = getRiskClass(analysis);
  const recommendation = getRecommendation(analysis);

  document.getElementById('riskScore').innerHTML =
    `Risk Score: <span class="${riskClass}">${analysis.totalScore}</span> — ${riskLabel}`;

  document.getElementById('highlights').innerHTML = analysis.matches.length > 0
    ? analysis.matches.map(r =>
        `<li>${r.reason}${r.isLocal ? ' <span class="local-intel-badge">Local</span>' : ''}</li>`
      ).join('')
    : '<li>No specific phishing patterns detected</li>';

  document.getElementById('tip').textContent = recommendation;
  document.getElementById('explanationText').textContent =
    "This analysis is based on both global and localized phishing patterns.";
  
  const mlPredictionElement = document.getElementById('mlPrediction');
  const mlConfidenceElement = document.getElementById('mlConfidence');

  mlPredictionElement.textContent = `ML Prediction: ${
    analysis.mlPrediction === 'phishing' ? 'Phishing detected' :
    (analysis.mlPrediction === 'suspicious' ? 'Suspicious' : 'Likely legitimate')}`;
  mlPredictionElement.className =
    analysis.mlPrediction === 'phishing' ? 'ml-phishing' :
    (analysis.mlPrediction === 'suspicious' ? 'ml-suspicious' : 'ml-safe');
  mlConfidenceElement.textContent = `Confidence: ${Math.round(analysis.mlConfidence * 100)}%`;
}

function getRiskLabel(analysis) {
  if (analysis.localMatches.length > 0 || analysis.totalScore >= 5) return "🔴 High Risk";
  if (analysis.totalScore >= 3) return "🟠 Medium Risk";
  return "🟢 Low Risk";
}

function getRiskClass(analysis) {
  if (analysis.localMatches.length > 0 || analysis.totalScore >= 5) return "high";
  if (analysis.totalScore >= 3) return "medium";
  return "safe";
}

function getRecommendation(analysis) {
  if (analysis.localMatches.length > 0 || analysis.totalScore >= 5)
    return "⚠️ This message shows signs of a known phishing scam in your region. Do NOT respond, click any links, or send any information or money.";
  if (analysis.totalScore >= 3)
    return "⚠️ Be cautious. This message contains suspicious elements. Verify the sender before taking any action.";
  return "✅ Looks safe. No major red flags detected. Always remain vigilant for suspicious requests.";
}

pdfBtn.addEventListener('click', generatePDFReport);

function generatePDFReport() {
  if (!currentAnalysis) return;
  try {
    const doc = new jsPDF();
    const timestamp = new Date();

    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Phishing Analysis Report', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Generated on: ${timestamp.toLocaleString()}`, 105, 30, { align: 'center' });

    // Risk assessment
    let y = 45;
    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text('Risk Assessment:', 14, y);
    y += 10;
    doc.setFontSize(12);
    doc.text(`Score: ${currentAnalysis.totalScore}`, 14, y);
    y += 10;
    doc.text(`Level: ${getRiskLabel(currentAnalysis).replace(/[🟢🟠🔴]/g, '')}`, 14, y);
    y += 15;

    // Analyzed content
    doc.setFontSize(14);
    doc.text('Analyzed Content:', 14, y);
    y += 10;
    doc.setFontSize(10);
    let contentLines = doc.splitTextToSize(currentAnalysis.input, 180);
    doc.text(contentLines, 14, y);
    y += contentLines.length * 5 + 5;

    // Detected patterns (table)
    doc.setFontSize(14);
    doc.text('Detected Phishing Patterns:', 14, y);
    y += 5;
    doc.autoTable({
      startY: y,
      head: [['Pattern Type', 'Local?']],
      body: currentAnalysis.matches.length > 0 
        ? currentAnalysis.matches.map(r => [r.reason, r.isLocal ? 'Yes' : 'No'])
        : [['None', '']],
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 10 }
    });
    let afterTable = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : y + 30;

    if (currentAnalysis.localMatches.length > 0) {
      y = afterTable;
      doc.setFontSize(14);
      doc.setTextColor(184, 135, 0);
      doc.text('⚠️ Localized Intelligence Triggered!', 14, y);
      doc.setFontSize(10);
      doc.setTextColor(20);
      y += 8;
      doc.text(doc.splitTextToSize(
        "This message matched one or more local phishing patterns common in your country or language. Stay extra vigilant—these tactics are often used to target people in your region.",
        180), 14, y);
      y += 18;
      doc.setFont("helvetica", "italic");
      doc.text("Matched local patterns:", 14, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      currentAnalysis.localMatches.forEach(localMatch => {
        doc.circle(16, y-2, 1, "F");
        doc.text(localMatch, 20, y);
        y += 6;
      });
      y += 6;
    } else {
      y = afterTable;
    }

    // ML Analysis
    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text('Machine Learning Analysis:', 14, y);
    doc.setFontSize(10);
    y += 10;
    doc.text(`Prediction: ${currentAnalysis.mlPrediction === 'phishing' ? 'Phishing' : (currentAnalysis.mlPrediction === 'suspicious' ? 'Suspicious' : 'Legitimate')}`, 14, y);
    y += 10;
    doc.text(`Confidence: ${Math.round(currentAnalysis.mlConfidence * 100)}%`, 14, y);
    y += 15;

    // Recommendations
    doc.setFontSize(14);
    doc.text('Recommendations:', 14, y);
    y += 8;
    doc.setFontSize(10);
    let recLines = doc.splitTextToSize(getRecommendation(currentAnalysis), 180);
    doc.text(recLines, 14, y);
    y += recLines.length * 5 + 8;

    if (y > 230) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(40, 64, 128);
    doc.text('Phishing Awareness', 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(20);
    const awarenessText = [
      "What is Phishing?",
      "Phishing is a type of cyber-attack where attackers trick individuals into giving away sensitive information such as passwords, banking details, or personal data by pretending to be a trustworthy entity, often through fake emails, links, or messages.",
      "",
      "How Does Phishing Work?",
      "- Attackers send emails or messages that look official, asking you to click links or provide info.",
      "- These links often lead to fake websites designed to steal your information.",
      "- Sometimes, phishing comes as SMS (smishing) or phone calls (vishing).",
      "",
      "Common Signs of Phishing:",
      "- Urgent language: “Your account will be suspended, act now!”",
      "- Requests for personal or financial information.",
      "- Suspicious links or attachments.",
      "- Poor grammar, spelling mistakes, or unfamiliar senders.",
      "",
      "Risks if You Fall for Phishing:",
      "- Identity theft",
      "- Financial loss",
      "- Unauthorized access to your accounts",
      "- Malware infection on your devices",
      "",
      "How to Stay Safe:",
      "- Always verify the sender’s information.",
      "- Don’t click on suspicious links or download unexpected attachments.",
      "- Never share personal information via email or message.",
      "- Use strong, unique passwords and enable two-factor authentication.",
      "- Report phishing attempts to your IT department or email provider.",
      "",
      "Remember:",
      "If something feels off, verify before you trust. Stay informed. Stay protected!"
    ];
    let awarenessLines = doc.splitTextToSize(awarenessText.join('\n'), 180);
    if (y + awarenessLines.length * 5 > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(awarenessLines, 14, y);

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Generated by Phishing Detector - For educational purposes', 105, 285, { align: 'center' });

    const filename = `Phishing_Report_${timestamp.getTime()}.pdf`;
    doc.save(filename);

    setTimeout(() => {
      alert('PDF report generated and downloaded!');
    }, 300);

  } catch (error) {
    console.error('PDF generation error:', error);
    alert('Error generating PDF. Please try again.');
  }
}
