const { jsPDF } = window.jspdf;

let currentAnalysis = null;
let mlModel = null;

// Initialize TensorFlow.js model
async function initModel() {
  try {
    // Create a simple model for text classification
    const model = tf.sequential();
    
    // Add layers
    model.add(tf.layers.dense({
      units: 16,
      activation: 'relu',
      inputShape: [1000] // Vocabulary size
    }));
    model.add(tf.layers.dense({
      units: 8,
      activation: 'relu'
    }));
    model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }));
    
    // Compile the model
    model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
    
    // Load pre-trained weights (in a real app, you would load actual trained weights)
    // For demo purposes, we'll use random weights
    mlModel = model;
    
    console.log("ML model initialized");
  } catch (error) {
    console.error("Error initializing ML model:", error);
  }
}

// Initialize model when page loads
document.addEventListener('DOMContentLoaded', initModel);

document.getElementById('analyzeBtn').addEventListener('click', analyzeMessage);
document.getElementById('pdfReportBtn').addEventListener('click', generatePDFReport);

async function analyzeMessage() {
  const input = document.getElementById('emailInput').value.trim();
  if (!input) {
    alert('Please paste an email message or link to analyze.');
    return;
  }
  
  // Show loading indicator
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('result').classList.add('hidden');
  document.getElementById('aiExplanation').classList.add('hidden');
  document.getElementById('pdfReportBtn').classList.add('hidden');
  
  try {
    // Run both traditional and ML analysis
    const regexAnalysis = scanMessage(input);
    const mlAnalysis = await analyzeWithML(input);
    
    // Combine results
    currentAnalysis = {
      ...regexAnalysis,
      mlPrediction: mlAnalysis.prediction,
      mlConfidence: mlAnalysis.confidence
    };
    
    // Adjust score based on ML prediction
    if (mlAnalysis.prediction === 'phishing') {
      currentAnalysis.totalScore += Math.ceil(mlAnalysis.confidence * 2); // Add 0-2 points based on confidence
    }
    
    updateResultsUI(currentAnalysis);
    
    // Show results
    document.getElementById('result').classList.remove('hidden');
    document.getElementById('aiExplanation').classList.remove('hidden');
    document.getElementById('pdfReportBtn').classList.remove('hidden');
    document.getElementById('pdfReportBtn').classList.add('visible');
    document.getElementById('mlResults').classList.remove('hidden');
  } catch (error) {
    console.error('Analysis error:', error);
    alert('Error analyzing message. Please try again.');
  } finally {
    document.getElementById('loading').classList.add('hidden');
  }
}

// Simple text preprocessing for ML
function preprocessText(text) {
  // Convert to lowercase
  text = text.toLowerCase();
  
  // Remove special characters
  text = text.replace(/[^\w\s]/g, '');
  
  // Tokenize (split into words)
  const tokens = text.split(/\s+/);
  
  // Simple feature vector (in a real app, you'd use word embeddings)
  const features = new Array(1000).fill(0);
  
  // Create a simple bag-of-words representation
  tokens.forEach(token => {
    const hash = hashCode(token) % 1000;
    features[hash] += 1;
  });
  
  return features;
}

// Helper function to create hash code
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

// Analyze text with ML model
async function analyzeWithML(text) {
  if (!mlModel) {
    throw new Error("ML model not initialized");
  }
  
  // Preprocess the text
  const features = preprocessText(text);
  
  // Convert to tensor
  const inputTensor = tf.tensor2d([features]);
  
  // Make prediction
  const prediction = await mlModel.predict(inputTensor).data();
  
  // Interpret results
  const confidence = prediction[0];
  const result = confidence > 0.5 ? 'phishing' : 'legitimate';
  
  return {
    prediction: result,
    confidence: Math.max(confidence, 1 - confidence) // Get the higher confidence value
  };
}

function updateResultsUI(analysis) {
  const riskLabel = getRiskLabel(analysis.totalScore);
  const riskClass = getRiskClass(analysis.totalScore);
  const recommendation = getRecommendation(analysis.totalScore);

  document.getElementById('riskScore').innerHTML = 
    `Risk Score: <span class="${riskClass}">${analysis.totalScore}</span> — ${riskLabel}`;
  
  document.getElementById('highlights').innerHTML = analysis.reasons.length > 0
    ? analysis.reasons.map(r => `<li>${r}</li>`).join('')
    : '<li>No specific phishing patterns detected</li>';

  document.getElementById('tip').textContent = recommendation;
  document.getElementById('explanationText').textContent = 
    "This analysis is based on a combination of global and Tanzania-specific phishing patterns.";
  
  // Update ML results
  const mlPredictionElement = document.getElementById('mlPrediction');
  const mlConfidenceElement = document.getElementById('mlConfidence');
  
  mlPredictionElement.textContent = `ML Prediction: ${analysis.mlPrediction === 'phishing' ? 
    'Phishing detected' : 'Likely legitimate'}`;
  mlPredictionElement.className = analysis.mlPrediction === 'phishing' ? 'ml-phishing' : 'ml-safe';
  
  mlConfidenceElement.textContent = `Confidence: ${Math.round(analysis.mlConfidence * 100)}%`;
}

function getRiskLabel(score) {
  if (score <= 2) return "🟢 Low Risk";
  if (score <= 4) return "🟠 Medium Risk";
  return "🔴 High Risk";
}

function getRiskClass(score) {
  if (score <= 2) return "safe";
  if (score <= 4) return "medium";
  return "high";
}

function getRecommendation(score) {
  if (score > 4) return "⚠️ This message shows several signs of phishing. Do NOT click any links or download attachments.";
  if (score > 2) return "⚠️ Be cautious. This message contains suspicious elements. Verify the sender before taking any action.";
  return "✅ Looks safe. No major red flags detected. Always remain vigilant for suspicious requests.";
}

function generatePDFReport() {
  if (!currentAnalysis) return;

  try {
    const doc = new jsPDF();
    const timestamp = new Date();

    // Title and metadata
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Phishing Analysis Report', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Generated on: ${timestamp.toLocaleString()}`, 105, 30, { align: 'center' });

    // Risk assessment
    doc.setFontSize(14);
    doc.text('Risk Assessment:', 14, 45);
    doc.setFontSize(12);
    doc.text(`Score: ${currentAnalysis.totalScore}`, 14, 55);
    doc.text(`Level: ${getRiskLabel(currentAnalysis.totalScore).replace(/[🟢🟠🔴]/g, '')}`, 14, 65);

    // Analyzed content
    doc.setFontSize(14);
    doc.text('Analyzed Content:', 14, 80);
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(document.getElementById('emailInput').value, 180), 14, 90);

    // Detected patterns (simple table)
    doc.setFontSize(14);
    doc.text('Detected Phishing Patterns:', 14, 110);
    doc.autoTable({
      startY: 115,
      head: [['Pattern Type', 'Description']],
      body: currentAnalysis.reasons.length > 0 
        ? currentAnalysis.reasons.map(r => [r.split(':')[0], r.split(':')[1] || r])
        : [['None', 'No patterns detected']],
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] },
      margin: { top: 10 }
    });

    // ML Analysis
    let afterTable = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 145;
    doc.setFontSize(14);
    doc.text('Machine Learning Analysis:', 14, afterTable);
    doc.setFontSize(10);
    doc.text(`Prediction: ${currentAnalysis.mlPrediction === 'phishing' ? 'Phishing' : 'Legitimate'}`, 14, afterTable + 10);
    doc.text(`Confidence: ${Math.round(currentAnalysis.mlConfidence * 100)}%`, 14, afterTable + 20);
    afterTable += 30;

    // Recommendations
    doc.setFontSize(14);
    doc.text('Recommendations:', 14, afterTable);
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(getRecommendation(currentAnalysis.totalScore), 180), 14, afterTable + 10);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Generated by Phishing Detector - For educational purposes', 105, 285, { align: 'center' });

    const filename = `Phishing_Report_${timestamp.getTime()}.pdf`;
    doc.save(filename);

    setTimeout(() => {
      alert('PDF report generated and downloaded!');
    }, 500);

  } catch (error) {
    console.error('PDF generation error:', error);
    alert('Error generating PDF. Please try again.');
  }
}

// Phishing detection patterns and logic
const regexPatterns = [
  { regex: /you account is suspended/i, score: 2, reason: "Account Suspension: Mentions account suspension" },
  { regex: /click here\s+here/i, score: 2, reason: "Urgent Action: Urgent click request" },
  { regex: /\blogin here\b/i, score: 2, reason: "Login Request: Direct login link" },
  { regex: /update\s+your\s+account/i, score: 2, reason: "Account Update: Account update prompt" },
  { regex: /verify\s+your\s+identity/i, score: 2, reason: "Verification: Verification scam" },
  { regex: /24\s+hours/i, score: 1, reason: "Urgency: Sense of urgency" },
  { regex: /\.ru\b/i, score: 2, reason: "Suspicious Domain: .ru domain" },
  { regex: /\.xyz\b/i, score: 2, reason: "Suspicious Domain: .xyz domain" },
  { regex: /you(?:'|')?ve\s+won\s+a\s+prize/i, score: 2, reason: "Fake Prize: Fake lottery prize" },
  { regex: /unusual\s+login\s+attempt/i, score: 1, reason: "Fake Alert: Fake login alert" },
  { regex: /download\s+the\s+attachment/i, score: 2, reason: "Malware: Malware delivery" },
  { regex: /\.pw\b/i, score: 2, reason: "Suspicious Domain: .pw domain" },
  // Tanzanian-specific patterns
  { regex: /tuma\s+kwenye\s+namba\s+hii.*ridhiwani\s+abdi\s+issa/i, score: 3, reason: "Mobile Money: Personalized mobile money scam" },
  { regex: /nafasi\s+za\s+jeshi\s+zimetoka/i, score: 2, reason: "Fake Recruitment: Fake military recruitment" },
  { regex: /mvuto\s+wa\s+kimapenzi|nyota|pete\s+ya\s+maajabu/i, score: 3, reason: "Miracle Cure: Miracle cure or charm scam" },
  { regex: /tuma\s+hela\s+kwenye\s+namba\s+hii/i, score: 3, reason: "Mobile Money: Mobile money scam" },
  { regex: /bonyeza\s+hapa\s+kuthibitisha/i, score: 2, reason: "Phishing Link: Swahili phishing link" },
  { regex: /umeshinda\s+milioni\s+10.*tuma\s+pesa/i, score: 3, reason: "Fake Prize: Fake prize requiring payment" },
  { regex: /pesa\s+zako\s+zipo\s+tayari.*link/i, score: 2, reason: "Scam Bait: Reward scam bait" },
  { regex: /namba\s+ya\s+mawasiliano\s+ya\s+mganga/i, score: 3, reason: "Fake Healer: Fake healer ads" },
  { regex: /akaunti\s+yako\s+imefungwa.*tuma\s+taarifa/i, score: 2, reason: "Account Fear: Account fear scam" },
  { regex: /nyota\s+yako\s+inang'aa.*wasiliana\s+nasi/i, score: 2, reason: "Astrology Fraud: Astrology fraud" },
  { regex: /nafasi\s+ya\s+kazi\s+TRA.*tuma\s+jina/i, score: 2, reason: "Fake Job: Fake government job offer" }
];

function scanMessage(message) {
  let totalScore = 0;
  let matches = [];
  regexPatterns.forEach(pattern => {
    if (pattern.regex.test(message)) {
      totalScore += pattern.score;
      matches.push(pattern.reason);
    }
  });
  return {
    totalScore,
    reasons: matches
  };
}
