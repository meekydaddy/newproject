# Localized Phishing Detector Project — Presentation & Understanding Guide

This document is designed to help a student understand, explain, and present every part of the Localized Phishing Detector project. It covers the project goal, each core file, technical details, and tips for presenting or answering questions during a defense.

---

## **Project Overview**

**Goal:**  
To build a web-based tool that detects phishing messages using both global and locally relevant scam patterns, with user-friendly risk reporting and PDF export for awareness and evidence.

**Key Features:**
- Scans messages for both global (English/international) and local (Swahili/Kenyan/Tanzanian, etc.) phishing patterns
- Reports risk level (low, medium, high) and highlights why
- Distinguishes local intelligence and flags regional scam attempts
- Generates PDF reports with results and anti-phishing awareness content
- All logic and UI runs in the browser — no server required

---

## **File-by-File Breakdown**

---

### 1. `index.html` — The User Interface

**Purpose:**  
Defines the structure and layout of the web application.

**Key Sections:**
- **Title/Header:** Name of the tool
- **Textarea:** Where the user pastes the suspicious message or link
- **Buttons:** "Analyze" to start detection, "Generate PDF" for a report
- **Result Areas:** Where the risk score and details appear after analysis
- **Localized Intelligence Badge:** Visible if a local scam pattern is detected
- **Score Guide:** Explains how to interpret risk scores
- **Footer:** Project credit and context

**Presentation Tips:**
- Point out how the UI guides the user to paste, analyze, and get instant feedback
- Show the “Localized Intelligence” warning as a unique feature for regional security

---

### 2. `style.css` — Styling

**Purpose:**  
Gives a modern, readable look to the app and visually distinguishes levels of risk.

**Key Concepts:**
- **Dark Mode:** Makes reading easier, especially for cybersecurity/IT audiences
- **Color Coding:**  
  - Green for low risk  
  - Yellow/orange for medium  
  - Red for high  
  - Gold/yellow badge for local intelligence
- **Responsive Design:** Works well on both desktop and mobile
- **Highlighting:** Results and tips are visually separated for quick scanning

**Presentation Tips:**
- Mention why color and clarity matter in security tools (quick risk recognition)
- If asked, explain that all styling is CSS, no frameworks needed

---

### 3. `local_phishing_patterns.json` — Local Scam Intelligence

**Purpose:**  
Supplies the “local knowledge” — patterns seen in real-world regional phishing. This is the key to catching scams that international tools might miss.

**How it Works:**
- Contains a list of entries, each with:
  - A **regex** (pattern to match, in Swahili or local context)
  - A **score** (higher = more dangerous)
  - A **reason** (for reporting to the user)
- JSON is loaded by the JavaScript on startup

**Example Patterns:**
- Mobile money account shutdowns (“akaunti yako ... mpesa ... sitish”)
- Fake jobs at government agencies (“nafasi za kazi ... TRA”)
- Lottery/lotto scams (“umeshinda ... milioni”)
- Miracle cures, bank alerts, and money transfer requests

**Presentation Tips:**
- Emphasize that these patterns can be easily updated as scams evolve
- Explain the benefit: makes the tool useful for your specific country/language

---

### 4. `script.js` — The Detection Logic & App Engine

**Purpose:**  
Handles all the app’s intelligence: loading patterns, scanning messages, updating the UI, and generating reports.

**Main Components:**
1. **Pattern Loading:**  
   - Loads `local_phishing_patterns.json` **once** at startup for speed
   - Combines with global (international) patterns for wide coverage

2. **Message Analysis:**  
   - Runs both global and local regexes on the pasted message
   - Adds up the “score” for each matched pattern
   - Flags/highlights any local intelligence triggered

3. **Risk Classification:**  
   - `Low risk`: score < 3  
   - `Medium risk`: 3 <= score < 5  
   - `High risk`: score >= 5 (or as set by your logic)
   - Shows reasons for each match (local or global)

4. **UI Update:**  
   - Instantly updates risk score, highlights, and recommendations
   - Shows/hides the Local Intelligence badge as needed
   - Disables results if the textarea is cleared

5. **PDF Report Generation:**  
   - Exports a summary with all findings, local hits, and an anti-phishing awareness section
   - Useful for sharing evidence or for educational materials

**Extra Features:**
- Confidence scoring (simulated “ML” output for user trust)
- Hides results and resets UI if the input is cleared, for a smooth user experience

**Presentation Tips:**
- Walk through how a message is processed from paste to result
- Show how local and global detection work together
- Highlight how the PDF helps in education and reporting

---

## **How the Detection Works (Step-by-Step)**

1. **User pastes a message and clicks “Analyze.”**
2. **Patterns are checked:**  
   - Both global (e.g., “account suspended”) and local (e.g., “akaunti yako ya M-Pesa imesitishwa”) regexes are run against the text.
3. **Scoring:**  
   - Each match adds to the total risk score. Local matches may be weighted higher.
4. **Risk interpretation:**  
   - Score is mapped to low/medium/high, with color and tips.
   - Local matches trigger a special warning.
5. **PDF Reporting:**  
   - All results, matches, and tips are exported to a PDF with an educational section.

---

## **Anticipated Questions & Good Answers**

**Q:** What happens if a new scam appears?  
**A:** Update the JSON file with a new pattern — no need to change the code.

**Q:** How is this better than just using global patterns?  
**A:** Local scams are often missed by international tools; this approach catches region-specific threats.

**Q:** What if a scam doesn’t match exactly?  
**A:** Regex patterns are designed to be broad. They can match variations, not just exact phrases.

**Q:** Can users contribute patterns?  
**A:** Yes, just add to the JSON file — it’s designed for easy updating.

**Q:** Is this real AI?  
**A:** The “ML” score is simulated, but the logic is designed to be transparent and explainable — unlike black-box AI.

---

## **Tips for a Strong Presentation**

- Demo both a “safe” email and a dangerous local scam message.
- Show the Local Intelligence badge in action.
- Walk through the PDF, highlighting the awareness section as a learning tool.
- If asked about limitations, mention regex can miss very new scams, but the system is easily updatable.
- Suggest future work: real machine learning, user-contributed patterns, browser extension, etc.

---

## **Conclusion**

This project demonstrates a practical, customizable approach to regional phishing detection, combining technical programming, real-world security thinking, and user-focused reporting.  
A student who understands each file and the logic above will be well-prepared to present, explain, and defend this project!
