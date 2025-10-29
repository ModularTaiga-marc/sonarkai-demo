# SonarKai Demo - Frontend Showcase

> 🎭 **Note:** This is a **frontend-only demo** with mockup data. No backend or API required!

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://sonarkai.onrender.com)

## 🎯 What is This?

SonarKai is an AI-powered business ontology generator that transforms **18 months of consulting work into a 2-minute automated process**.

**This repository contains:**
- ✅ Interactive frontend with D3.js knowledge graph visualization
- ✅ Wizard interface for company data entry
- ✅ Pre-built mockup data for insurance, banking, healthcare, technology
- ✅ Fully functional demo running in your browser (no backend needed!)

**This repository does NOT contain:**
- ❌ Backend API server (proprietary)
- ❌ LLM integration (Anthropic Claude, Groq)
- ❌ Real company data or regulatory knowledge bases
- ❌ Production deployment infrastructure

---

## 🚀 Try the Live Demo

**Production:** https://sonarkai.onrender.com

The live version includes the full AI-powered backend with real LLM integration.

---

## 💻 Run Locally

```bash
# Clone the repository
git clone https://github.com/ModularTaiga-marc/sonarkai-demo.git
cd sonarkai-demo

# Open in browser (no build step needed!)
open index.html

# Or use a local server (recommended):
python3 -m http.server 8000
# Then visit: http://localhost:8000
```

**That's it!** The demo runs entirely client-side with mockup data.

---

## 🎨 What You'll See

### 1. Landing Page
- Clear value proposition: **18 months → 2 minutes**
- Feature showcase (regulatory framework, business structure, processes, glossary)
- Export capabilities (Collibra, Alation, Informatica, Atlan)

### 2. Interactive Wizard
- **Step 1:** Enter company information
- **Step 2:** Select industry (insurance, banking, healthcare, technology)
- **Step 3:** Choose headquarters location
- Click "Generate Ontology" to see the magic!

### 3. Knowledge Graph Visualization
- **D3.js force-directed graph** with interactive nodes
- **Company/Party nodes** (blue) - Your organization
- **Regulation nodes** (green) - Applicable regulations (GDPR, IFRS 17, Basel III, etc.)
- **Business Line nodes** (purple) - Lines of business
- **Process nodes** (orange) - Business processes
- **Expandable connections** - Click nodes to explore relationships

---

## 🏗️ Architecture

### Frontend Stack
- **Vanilla JavaScript** - No framework bloat, fast load times
- **D3.js v7** - Force-directed graph visualization
- **Tailwind CSS (CDN)** - Responsive styling
- **HTML5** - Semantic, accessible markup

### Mockup Data
All data is client-side JSON files - no API calls needed!

```
mockup-data/
├── companies.json          # 4 sample companies (insurance, banking, healthcare, tech)
├── regulations.json        # Industry-specific regulations (GDPR, IFRS 17, Basel III, etc.)
├── business-lines.json     # Sample business structures
└── processes.json          # Sample business processes
```

### File Structure
```
sonarkai-demo/
├── index.html              # Landing page
├── generate/
│   └── index.html          # Wizard & knowledge graph
├── js/
│   ├── app-semantic-catalyst.js       # Wizard forms
│   ├── app-interactive-navigation.js  # D3.js graph
│   └── mockup-data-loader.js          # Client-side data loader
├── assets/
│   └── favicon.svg
├── mockup-data/
│   ├── companies.json
│   ├── regulations.json
│   ├── business-lines.json
│   └── processes.json
└── docs/
    ├── ARCHITECTURE.md
    └── CUSTOMIZATION.md
```

---

## 📊 Sample Data Included

### Companies
- **Acme Insurance Co.** (Life & Health Insurance, USA)
- **Global Bank Corp** (Investment Banking, UK)
- **MedTech Solutions** (Medical Devices, Germany)
- **TechFlow Systems** (SaaS Provider, Ireland)

### Regulations
- **GDPR** - Data protection (all industries)
- **IFRS 17** - Insurance contracts (insurance)
- **Solvency II** - Insurance prudential regulation (insurance)
- **Basel III** - Banking capital requirements (banking)
- **MiFID II** - Financial instruments (banking)
- **HIPAA** - Healthcare data protection (healthcare)
- **MDR** - Medical device regulation (healthcare)
- **EU AI Act** - Artificial intelligence (technology)

### Industries Covered
- 🏦 **Insurance** - Life, health, property insurance
- 💰 **Banking** - Retail, investment, wealth management
- 🏥 **Healthcare** - Medical devices, patient monitoring
- 💻 **Technology** - Cloud services, data analytics, AI

---

## 🎓 How It Works

### Mockup Mode
The demo uses **mockup-data-loader.js** to intercept API calls and return client-side data:

1. User enters company info in wizard
2. JavaScript matches company to mockup data
3. D3.js renders knowledge graph from JSON
4. User can explore nodes and relationships
5. No backend required - all browser-based!

### Real Version (Production)
The live version at [sonarkai.onrender.com](https://sonarkai.onrender.com) includes:
- FastAPI backend with LLM integration
- Anthropic Claude for high-quality enrichment
- Groq Llama for fast processing
- 24-hour intelligent caching
- Real regulatory knowledge bases
- Process extraction from documents

---

## 🤝 Contributing

This is a demo repository showcasing the frontend capabilities of SonarKai.

**Found a bug in the demo?**
- Open an issue: https://github.com/ModularTaiga-marc/sonarkai-demo/issues
- Use the "Report / Feedback" button in the app

**Want to add mockup data?**
- Fork the repo
- Add your industry/company examples to `mockup-data/`
- Submit a pull request

**Want the full product?**
- Visit: https://sonarkai.onrender.com
- Contact: marc@modulartaiga.com
- LinkedIn: [marcrafaellafuente](https://www.linkedin.com/in/marcrafaellafuente/)

---

## 📄 License

**MIT License** - see [LICENSE](LICENSE) file for details.

This demo is open source and free to use, modify, and distribute.

**Note:** The full SonarKai product (backend, AI engine, regulatory databases) is proprietary.

---

## 👤 Author

**Marc Rafael Lafuente**
- CDMP Certified by DAMA-I
- Member of DAMA Spain
- Founder & CEO, [Modular Taiga](https://modulartaiga.com)
- 15+ years in Data Governance
- LinkedIn: [marcrafaellafuente](https://www.linkedin.com/in/marcrafaellafuente/)

### Background
After nearly two decades in data governance across major enterprises (insurance, financial services), I've seen organizations spend 12-18 months and $300-500K building business ontologies.

SonarKai automates this process using AI, reducing the timeline from months to minutes while maintaining professional quality.

---

## 🌟 Key Features Demonstrated

### ✅ In This Demo
- Interactive D3.js knowledge graph
- Wizard-based data entry
- Force-directed layout algorithm
- Node expansion and exploration
- Responsive design (mobile-friendly)
- Zero-configuration setup
- Client-side mockup data

### 🚀 In Full Product (Production)
- AI-powered regulation discovery
- LLM-based process extraction
- Real-time company enrichment
- Document analysis and synthesis
- Multi-language support
- Export to RDF, OWL, JSON-LD, GraphML
- Direct integration with Collibra, Alation, Informatica, Atlan
- Enterprise-grade caching and optimization

---

## 📚 Learn More

- **Live Demo:** https://sonarkai.onrender.com
- **Documentation:** See `/docs` folder
- **Blog Post:** [Coming soon]
- **Video Demo:** [Coming soon]

---

## 💡 Use Cases

### Data Governance Professionals
- Quickly visualize regulatory landscape
- Explore business process hierarchies
- Generate starter business glossaries
- Demo ontology concepts to stakeholders

### Enterprise Architects
- Understand business capability models
- Map process relationships
- Visualize organizational structure
- Plan data architecture initiatives

### Students & Researchers
- Learn about knowledge graphs
- Explore D3.js visualization techniques
- Study business ontology structures
- Understand regulatory frameworks

### Developers
- See clean vanilla JavaScript architecture
- Learn D3.js force-directed graphs
- Study client-side data modeling
- Build on MIT-licensed code

---

## 🙏 Acknowledgments

Built with:
- [D3.js](https://d3js.org/) - Data visualization
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Font Awesome](https://fontawesome.com/) - Icons

Inspired by years of frustration with manual ontology creation processes.

---

## 📞 Support

**Questions or feedback?**
- GitHub Issues: https://github.com/ModularTaiga-marc/sonarkai-demo/issues
- Email: marc@modulartaiga.com
- LinkedIn: [marcrafaellafuente](https://www.linkedin.com/in/marcrafaellafuente/)

**Commercial inquiries:**
- Full SonarKai product: marc@modulartaiga.com
- Consulting services: https://modulartaiga.com
- Custom ontology projects: Available on request

---

**Built with ❤️ for the Data Governance community**

*SonarKai is the first product in the Kaimak data governance suite.*
