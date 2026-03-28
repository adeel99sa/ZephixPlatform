# Reference Materials

External research, books, frameworks, and standards used to validate and improve the Zephix platform.

## Structure

| Folder | What Goes Here | Examples |
|--------|---------------|----------|
| `books/` | PM books, methodology books, PDFs, summaries | PMBOK Guide, Agile Practice Guide, Shape Up, Team Topologies |
| `frameworks/` | PM framework documentation and analysis | PMBOK, PRINCE2, SAFe, Scrum Guide, Kanban, OKR |
| `standards/` | Industry standards, compliance references | ISO 21500, PMI Standards, SOC2 requirements |

## How Cursor Uses These

When books or documents are placed here, Cursor will:
1. Read and analyze the content
2. Compare Zephix features against documented best practices
3. Identify gaps where Zephix is missing standard PM capabilities
4. Propose feature additions or adjustments based on evidence
5. Validate that Zephix's architecture supports the required workflows

## Recommended Books to Add

### Project Management Methodology
- **PMBOK Guide** (7th Edition) — The PM standard. Covers scope, schedule, cost, quality, resource, communications, risk, procurement, stakeholder management.
- **Agile Practice Guide** (PMI) — Agile frameworks and when to use them.
- **PRINCE2** — Process-based PM methodology popular in UK/Europe/government.
- **SAFe Reference Guide** — Scaled Agile for enterprise portfolio management.

### Product & Delivery
- **Shape Up** (Basecamp) — Alternative to sprints. Six-week cycles, appetite-based scoping.
- **Inspired** (Marty Cagan) — Product management and discovery.
- **Continuous Delivery** (Jez Humble) — Deployment pipelines, release management.

### Team & Organization
- **Team Topologies** (Skelton & Pais) — Team structures for fast flow.
- **An Elegant Puzzle** (Will Larson) — Engineering management systems.
- **Accelerate** (Forsgren, Humble, Kim) — DevOps and delivery metrics.

### Risk & Governance
- **Waltzing with Bears** (DeMarco & Lister) — Risk management in software projects.
- **The Standard for Risk Management in Portfolios, Programs, and Projects** (PMI)

### Resource Management
- **Resource Management for the Project Practitioner** — Capacity planning, allocation strategies.
- **The People Side of Project Management** — Human resource challenges.

### Enterprise PM Platforms (Competitor Deep Dives)
- Any published analyses, Gartner reports, or Forrester Wave reports on PM tools.

## Supported File Formats

- `.pdf` — Cursor can read and analyze PDFs
- `.md` — Markdown summaries (preferred for quick reference)
- `.txt` — Plain text extracts

## Usage

```bash
# Drop files into the appropriate folder
cp ~/Downloads/pmbok-7th-edition.pdf docs/reference/books/
cp ~/Downloads/safe-reference-guide.pdf docs/reference/frameworks/

# Then ask Cursor to analyze
# "Read the PMBOK guide and compare Zephix's risk management against PMI standards"
# "What PM capabilities does PMBOK require that Zephix is missing?"
```
