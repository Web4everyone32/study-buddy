# study-buddy

Study Buddy is an AI-powered learning extension that transforms any online text into personalized study material — helping students learn smarter and more confidently. It is especially designed to support learners with dyslexia and reading challenges through accessibility-first features.

✨ Features

Instant Summaries — shorten long paragraphs into clear key points

Simplified Explanations — rewrite complex sentences for easier understanding

AI-Generated Quizzes — MCQs and flashcards created directly from selected text

Translate Content — multilingual learning support

Compare Mode — view simplified vs original content side-by-side

Revision History — automatically saves study outputs for later review

Dyslexia-Friendly Reading Tools:

Better font spacing and formatting

High-contrast modes

Clear word chunking for improved readability

🎯 Who is it for?

✔️ Students facing difficulty comprehending academic text
✔️ Dyslexia and neurodivergent learners
✔️ Anyone preparing for exams or quick revision
✔️ Self-learners exploring new subjects online


**“Everything judges/users need to test”**

**Installation**


1️⃣ Install **Chrome Beta**  
👉 https://www.google.com/chrome/beta/

Version Used : 143.0.7499.4 (Official Build) beta (64-bit) 
Minimum version required : 143.0.0.0

2️⃣ Enable required experimental features  
Open: `chrome://flags`  
Enable the following (search each in the flags list):

- Experimental Web Platform Features              #enable-experimental-web-platform-features
- Prompt API features (if shown in your version)  #prompt-api-for-gemini-nano
- Summarization Model API (if shown)              #summarization-api-for-gemini-nano
- Translation Model API (if shown)                #translation-api-for-gemini-nano
- Chrome AI #optimization-guide-on-device-model   #optimization-guide-on-device-model
- Side Panel Web Apps                             #side-panel-web-apps

Then **Restart Chrome** ✅

3️⃣ Install the Extension  
- Clone/Download this repository  
- Visit: `chrome://extensions/`  
- Enable **Developer Mode** (top right)  
- Click **Load unpacked**  
- Select this project folder  
- Pin the extension for easy access  

You're ready to use Study Buddy! 🎓

---

## ▶️ How to Use

1. Highlight any text on a webpage  
2. Open Study Buddy from:
   - Toolbar icon, or
   - Right-click Context Menu → *Study with Buddy*
3. Select a feature:
   - **Summarize**
   - **Simplify**
   - **Translate**
   - **Quiz Me**
4. Review output, compare versions, or save to history for revision

---

## 🧪 Testing Guide (for judges/users)

🧪 Detailed Testing Steps 

This guide ensures that judges/users can validate all core features of Study Buddy, including AI behavior, accessibility support, and privacy design.

✅ Before You Begin (Setup Checklist)
Step	Action	Status
1	Install Chrome Beta	✅
2	Enable required flags in chrome://flags	✅
3	Restart Chrome	✅
4	Use the extension if the Model availability status is not ready. It would start downloading. Wait for a minute or two as the model downloads	✅

📌 Testing should begin only after AI model download status is complete.
You will see ✅ Model Available status inside the extension UI.


✅ Test Case 1 — Summarization

Goal: Convert long or complex text into clear, short bullet points.

Steps

Open a long paragraph on a webpage (e.g., Wikipedia article)

Select 3–6 sentences

Open Study Buddy → Tap Summarize

Expected Behavior

Summary contains 3–6 bullet points

Clear, well-structured ideas

Removes unnecessary filler text

✅ Pass if: Result improves comprehension noticeably

✅ Test Case 2 — Simplification (Dyslexia-support focus)

Goal: Improve readability for neurodivergent learners.

Steps

Select a complex sentence with difficult vocabulary

Tap Simplify

Expected Behavior

Shorter sentences

Easier vocabulary

Logical sentence breaks

Reduced cognitive load

✅ Pass if: Output is significantly easier to read

✅ Test Case 3 — AI-Generated Quizzes

Goal: Provide meaningful comprehension checks.

Steps

Select a concept-rich paragraph

Tap Quiz Me

Expected Behavior

3–5 MCQs / Flashcards

Each includes:

One correct answer

3 believable distractors

No hallucinated facts

✅ Pass if: Questions match selected text logically

✅ Test Case 4 — Translation

Goal: Multilingual accessibility.

Steps

Select any sentence

Choose a language from dropdown → Tap Translate

Expected Behavior

Text translated with contextual accuracy

No change to meaning

Clean readable script in output

✅ Pass if: Translation improves understanding for non-native readers

✅ Test Case 5 — Compare Mode

Goal: Side-by-side concept clarity.

Steps

Perform Summarize or Simplify

Tap Compare

Expected Behavior

Left = original content

Right = simplified/summary version

Clear differences in complexity

✅ Pass if: Concept differences are visually obvious

✅ Test Case 6 — Accessibility & Dyslexia Readability

Goal: Ensure usability for students with reading challenges.

Steps

Enable dyslexia-friendly display settings (toggle visible in extension)

Navigate only using:

Tab, Enter, and Arrow keys

Optionally test with a screen reader

Expected Behavior

Increased line spacing

Better typography (if enabled)

Focus indicator visible on all controls

Screen reader reads controls in proper order

✅ Pass if: Interface remains fully operable & easier to read

✅ Test Case 7 — Offline Support & Privacy

Goal: Confirm that learning support works without cloud dependency.

Steps

Turn off Wi-Fi / enter offline mode

Perform Summarize and Simplify again

Expected Behavior

AI still responds (if on-device model already downloaded)

No warnings about missing external servers

No network requests visible in DevTools → Network tab

✅ Pass if: Study Buddy keeps helping even in offline learning conditions

---

## 🧠 Who It Helps

- Students in school/college
- Students with dyslexia or reading difficulty
- Exam preparation and revision
- Self-learners browsing the web

Every student deserves access to clear understanding.

---

## 🧱 Built With

- JavaScript  
- HTML5  
- CSS3  
- Chrome Extension Platform (Manifest V3)  
- Built-in Browser AI APIs:
  - Summarizer API
  - Language / Prompt API
  - Translator API  
- Local Storage for privacy-preserving study history  
- Accessibility-optimized UI design  

---

## 🔮 What’s Next

- Voice input + read aloud support  
- Gamified learning streaks  
- Visual AR learning tools  
- Smarter difficulty-based quizzes  
- Teacher / peer deck sharing  
- Full offline model download  

We are dedicated to making learning **independent, inclusive, and inspiring**.

---

## 🤝 Contributing

We welcome:
- Accessibility enhancements  
- New languages / subjects  
- UI improvements  
- Better quiz logic  

Feel free to fork this project and submit PRs!

---

## 📄 License

This project is licensed under the **MIT License**.  
Free for anyone to use, modify, and improve.
