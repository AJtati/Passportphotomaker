const SECTION_TITLES = {
  summary: 'Professional Summary',
  experience: 'Experience',
  projects: 'Projects',
  skills: 'Technical Skills',
  education: 'Education',
};

export const SECTION_OPTIONS = [
  { type: 'summary', title: SECTION_TITLES.summary },
  { type: 'experience', title: SECTION_TITLES.experience },
  { type: 'projects', title: SECTION_TITLES.projects },
  { type: 'skills', title: SECTION_TITLES.skills },
  { type: 'education', title: SECTION_TITLES.education },
];

export const createDefaultResumeModel = () => ({
  contact: {
    name: 'Firstname Lastname',
    phone: '123-456-7890',
    email: 'email@gmail.com',
    location: 'City, State',
    linkedin: 'linkedin.com/in/username',
    github: 'github.com/username',
  },
  sections: [
    {
      id: 'summary',
      type: 'summary',
      title: SECTION_TITLES.summary,
      bullets: [
        'Software engineer focused on reliable, ATS-friendly products, clean implementation, and measurable business outcomes.',
      ],
    },
    {
      id: 'experience',
      type: 'experience',
      title: SECTION_TITLES.experience,
      items: [
        {
          role: 'Undergraduate Research Assistant',
          company: 'University Lab',
          location: 'City, State',
          dates: 'June 2020 -- Present',
          bullets: [
            'Developed a research application using Python and Django, enabling efficient data visualization for over 200 researchers.',
            'Optimized database queries, reducing load times by 40\\% and increasing concurrent user capacity.',
          ],
        },
        {
          role: 'Software Engineer Intern',
          company: 'Tech Company',
          location: 'City, State',
          dates: 'May 2019 -- Aug. 2019',
          bullets: [
            'Collaborated with a team of 5 engineers to build a dashboard using React and Node.js.',
            'Implemented unit tests, increasing overall code coverage from 65\\% to 80\\%.',
          ],
        },
      ],
    },
    {
      id: 'projects',
      type: 'projects',
      title: SECTION_TITLES.projects,
      items: [
        {
          name: 'GitTracker',
          stack: 'React, Node.js, GitHub API',
          dates: 'June 2020 -- Present',
          bullets: [
            'Built a tool that visualizes repository activity using graphs and charts.',
            'Secured user data using OAuth2 and encrypting session tokens.',
          ],
        },
      ],
    },
    {
      id: 'skills',
      type: 'skills',
      title: SECTION_TITLES.skills,
      groups: [
        { label: 'Languages', value: 'Python, Java, C++, HTML/CSS, JavaScript, SQL' },
        { label: 'Frameworks', value: 'React, Node.js, Flask, Django, Bootstrap' },
        { label: 'Developer Tools', value: 'Git, Docker, Google Cloud Platform, AWS, VS Code' },
        { label: 'Libraries', value: 'pandas, NumPy, Matplotlib' },
      ],
    },
    {
      id: 'education',
      type: 'education',
      title: SECTION_TITLES.education,
      items: [
        {
          school: 'University Name',
          location: 'City, State',
          degree: 'Bachelor of Science in Computer Science',
          dates: 'Aug. 2018 -- Dec. 2021',
        },
      ],
    },
  ],
});

export const cloneResumeModel = (model) => JSON.parse(JSON.stringify(model));

export const createSection = (type) => {
  const id = `${type}-${Date.now()}`;
  if (type === 'summary') {
    return {
      id,
      type,
      title: SECTION_TITLES.summary,
      bullets: ['Concise professional summary focused on impact, scope, and strengths.'],
    };
  }
  if (type === 'experience') {
    return {
      id,
      type,
      title: SECTION_TITLES.experience,
      items: [{ role: 'Job Title', company: 'Company', location: 'City, State', dates: 'Jan 2024 -- Present', bullets: ['Describe measurable impact and relevant tools.'] }],
    };
  }
  if (type === 'projects') {
    return {
      id,
      type,
      title: SECTION_TITLES.projects,
      items: [{ name: 'Project Name', stack: 'Tech Stack', dates: '2024', bullets: ['Describe the problem, implementation, and result.'] }],
    };
  }
  if (type === 'skills') {
    return { id, type, title: SECTION_TITLES.skills, groups: [{ label: 'Languages', value: 'JavaScript, Python, SQL' }] };
  }
  return {
    id,
    type: 'education',
    title: SECTION_TITLES.education,
    items: [{ school: 'University Name', location: 'City, State', degree: 'Degree / Certification', dates: '2020 -- 2024' }],
  };
};

const latexEscape = (value = '') =>
  String(value)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');

const latexText = (value = '') =>
  latexEscape(value)
    .replace(/\\textbackslash\{\}\s*%/g, '\\%')
    .replace(/--/g, '--');

const latexUrlText = (value = '') => latexEscape(String(value).replace(/^https?:\/\//, ''));

const hrefFor = (value = '', fallbackProtocol = 'https://') => {
  const text = String(value).trim();
  if (!text) return '';
  if (text.includes('@') && !text.startsWith('mailto:')) return `mailto:${text}`;
  if (/^https?:\/\//i.test(text) || /^mailto:/i.test(text)) return text;
  return `${fallbackProtocol}${text}`;
};

const renderBullets = (bullets = []) => {
  const cleanBullets = bullets.filter((bullet) => String(bullet).trim());
  if (!cleanBullets.length) return '';
  return `      \\resumeItemListStart
${cleanBullets.map((bullet) => `        \\resumeItem{${latexText(bullet)}}`).join('\n')}
      \\resumeItemListEnd`;
};

const renderSection = (section) => {
  if (section.type === 'summary') {
    const summaryBullets = (section.bullets || [])
      .filter((bullet) => String(bullet).trim());
    const summaryContent = summaryBullets.length ? summaryBullets : [section.content || ''];
    const shouldRenderParagraph = summaryContent.length <= 1;

    return `%VISUAL_SECTION:${section.id}:summary
\\section{${latexText(section.title || SECTION_TITLES.summary)}}
${shouldRenderParagraph ? `\\small{${latexText(summaryContent[0] || '')}}` : `\\resumeItemListStart
${summaryContent.map((bullet) => `  \\resumeItem{${latexText(bullet)}}`).join('\n')}
\\resumeItemListEnd`}`;
  }

  if (section.type === 'experience') {
    const items = (section.items || []).map((item) => `    \\resumeSubheading
      {${latexText(item.role)}}{${latexText(item.dates)}}
      {${latexText(item.company)}}{${latexText(item.location)}}
${renderBullets(item.bullets)}`).join('\n\n');
    return `%VISUAL_SECTION:${section.id}:experience
\\section{${latexText(section.title || SECTION_TITLES.experience)}}
  \\resumeSubHeadingListStart
${items}
  \\resumeSubHeadingListEnd`;
  }

  if (section.type === 'projects') {
    const items = (section.items || []).map((item) => `      \\resumeProjectHeading
          {\\textbf{${latexText(item.name)}} $|$ \\emph{${latexText(item.stack)}}}{${latexText(item.dates)}}
${renderBullets(item.bullets)}`).join('\n');
    return `%VISUAL_SECTION:${section.id}:projects
\\section{${latexText(section.title || SECTION_TITLES.projects)}}
    \\resumeSubHeadingListStart
${items}
    \\resumeSubHeadingListEnd`;
  }

  if (section.type === 'skills') {
    const groups = (section.groups || [])
      .filter((group) => String(group.label || group.value || '').trim())
      .map((group, index, list) => {
        const suffix = index === list.length - 1 ? '' : ' \\\\';
        return `     \\textbf{${latexText(group.label)}}{: ${latexText(group.value)}}${suffix}`;
      })
      .join('\n');
    return `%VISUAL_SECTION:${section.id}:skills
\\section{${latexText(section.title || SECTION_TITLES.skills)}}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
${groups}
    }}
 \\end{itemize}`;
  }

  const items = (section.items || []).map((item) => `    \\resumeSubheading
      {${latexText(item.school)}}{${latexText(item.location)}}
      {${latexText(item.degree)}}{${latexText(item.dates)}}`).join('\n');
  return `%VISUAL_SECTION:${section.id}:education
\\section{${latexText(section.title || SECTION_TITLES.education)}}
  \\resumeSubHeadingListStart
${items}
  \\resumeSubHeadingListEnd`;
};

export const generateLatexFromResumeModel = (model) => {
  const contact = model.contact || {};
  const emailHref = hrefFor(contact.email, 'mailto:');
  const linkedinHref = hrefFor(contact.linkedin);
  const githubHref = hrefFor(contact.github);
  const contactParts = [
    latexText(contact.phone),
    contact.email ? `\\href{${emailHref}}{\\underline{${latexText(contact.email)}}}` : '',
    contact.linkedin ? `\\href{${linkedinHref}}{\\underline{${latexUrlText(contact.linkedin)}}}` : '',
    contact.github ? `\\href{${githubHref}}{\\underline{${latexUrlText(contact.github)}}}` : '',
    latexText(contact.location),
  ].filter(Boolean);

  return `% Generated by Photo Print Utility Visual Resume Builder
\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\input{glyphtounicode}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

\\pdfgentounicode=1

\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\item
    \\begin{tabular*}{\\textwidth}[t]{@{}l@{\\extracolsep{\\fill}}r@{}}
      \\textbf{#1} & #2 \\\\
      \\textit{#3} & \\textit{#4} \\\\
    \\end{tabular*}\\vspace{-6pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

\\begin{document}

%VISUAL_CONTACT_START
\\begin{center}
    \\textbf{\\Huge \\scshape ${latexText(contact.name)}} \\\\ \\vspace{1pt}
    \\small ${contactParts.join(' $|$ ')}
\\end{center}
%VISUAL_CONTACT_END

${normalizeSections(model.sections || []).map(renderSection).join('\n\n')}

\\end{document}
`;
};

const unescapeLatex = (value = '') =>
  String(value)
    .replace(/\\underline\{([^{}]*)\}/g, '$1')
    .replace(/\\textbf\{([^{}]*)\}/g, '$1')
    .replace(/\\emph\{([^{}]*)\}/g, '$1')
    .replace(/\\small/g, '')
    .replace(/\\%/g, '%')
    .replace(/\\&/g, '&')
    .replace(/\\_/g, '_')
    .replace(/\\#/g, '#')
    .replace(/\\\$/g, '$')
    .replace(/\\\{/g, '{')
    .replace(/\\\}/g, '}')
    .replace(/\\textbackslash\{\}/g, '\\')
    .trim();

const matchAll = (text, regex) => Array.from(text.matchAll(regex));

const parseBracedCommandItems = (sectionText, commandName, fields) =>
  matchAll(sectionText, new RegExp(`\\\\${commandName}\\s*\\n?\\s*\\{([^{}]*)\\}\\s*\\{([^{}]*)\\}\\s*\\n?\\s*\\{([^{}]*)\\}\\s*\\{([^{}]*)\\}`, 'g'))
    .map((match) => fields.reduce((item, field, index) => ({ ...item, [field]: unescapeLatex(match[index + 1]) }), {}));

const parseClassicHeadingItems = (sectionText, fields) =>
  matchAll(sectionText, /\\textbf\{([^{}]*)\}\s*\\hfill\s*([^\n\\]+)\s*\\\\\s*\\textit\{([^{}]*)\}([\s\S]*?)(?=\\textbf\{|$)/g)
    .map((match) => {
      const [leftField, datesField, detailField] = fields;
      const detailParts = unescapeLatex(match[3]).split(',').map((part) => part.trim()).filter(Boolean);
      return {
        [leftField]: unescapeLatex(match[1]),
        [datesField]: unescapeLatex(match[2]),
        [detailField]: detailParts[0] || unescapeLatex(match[3]),
        location: detailParts.slice(1).join(', '),
        bullets: matchAll(match[4], /\\item\s+([^\n]+)/g).map((itemMatch) => unescapeLatex(itemMatch[1])),
      };
    });

const parseRoleMacroItems = (sectionText) =>
  matchAll(sectionText, /\\resumeRole\{([^{}]*)\}\{([^{}]*)\}\{([^{}]*)\}\{([^{}]*)\}([\s\S]*?)(?=\\resumeRole\{|$)/g)
    .map((match) => ({
      role: unescapeLatex(match[1]),
      dates: unescapeLatex(match[2]),
      company: unescapeLatex(match[3]),
      location: unescapeLatex(match[4]),
      bullets: matchAll(match[5], /\\item\s+([^\n]+)/g).map((itemMatch) => unescapeLatex(itemMatch[1])),
    }));

const parseClassicEducationItems = (sectionText) =>
  matchAll(sectionText, /\\textbf\{([^{}]*)\}\s*\\hfill\s*([^\n\\]+)\s*\\\\\s*\\textit\{([^{}]*)\}/g)
    .map((match) => {
      const detailParts = unescapeLatex(match[3]).split(',').map((part) => part.trim()).filter(Boolean);
      return {
        degree: unescapeLatex(match[1]),
        dates: unescapeLatex(match[2]),
        school: detailParts[0] || unescapeLatex(match[3]),
        location: detailParts.slice(1).join(', '),
      };
    });

const parseClassicSkills = (sectionText) =>
  matchAll(sectionText, /\\textbf\{([^{}:]+):\}\s*&\s*([^\\]+)\\\\/g)
    .map((match) => ({ label: unescapeLatex(match[1]), value: unescapeLatex(match[2]) }));

const parseBulletsAfter = (sectionText, startIndex) => {
  const nextStart = sectionText.indexOf('\\resumeSubheading', startIndex + 1);
  const nextProject = sectionText.indexOf('\\resumeProjectHeading', startIndex + 1);
  const candidates = [nextStart, nextProject].filter((index) => index > -1);
  const endIndex = candidates.length ? Math.min(...candidates) : sectionText.length;
  const block = sectionText.slice(startIndex, endIndex);
  return matchAll(block, /\\resumeItem\{([^{}]*)\}/g).map((match) => unescapeLatex(match[1]));
};

const getSectionBlocks = (latex) => {
  const matches = matchAll(latex, /\\section\{([^{}]*)\}/g);
  return matches.map((match, index) => {
    const start = match.index;
    const end = matches[index + 1]?.index ?? latex.indexOf('\\end{document}');
    return {
      title: unescapeLatex(match[1]),
      text: latex.slice(start, end > -1 ? end : latex.length),
    };
  });
};

const typeFromTitle = (title) => {
  const normalized = title.toLowerCase();
  if (normalized.includes('summary')) return 'summary';
  if (normalized.includes('experience')) return 'experience';
  if (normalized.includes('project')) return 'projects';
  if (normalized.includes('skill')) return 'skills';
  if (normalized.includes('education')) return 'education';
  return null;
};

export const normalizeSections = (sections = []) => {
  const summarySections = sections.filter((section) => section.type === 'summary');
  const otherSections = sections.filter((section) => section.type !== 'summary');
  if (summarySections.length) {
    return [summarySections[0], ...otherSections];
  }
  return [createSection('summary'), ...otherSections];
};

export const parseLatexToResumeModel = (latex) => {
  if (!latex || !latex.includes('\\begin{document}')) return null;

  const fallback = createDefaultResumeModel();
  const model = { contact: { ...fallback.contact }, sections: [] };

  const nameMatch = latex.match(/\\textbf\{\\Huge(?:\\s+\\scshape)?\s+([^{}]*)\}/) || latex.match(/\{\\Huge\s+\\bfseries\s+([^{}]*)\}/);
  if (nameMatch) model.contact.name = unescapeLatex(nameMatch[1]);

  const emailMatch = latex.match(/mailto:([^}]+)\}\{(?:\\underline\{)?([^{}]+)\}?/) || latex.match(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  if (emailMatch) model.contact.email = unescapeLatex(emailMatch[2] || emailMatch[1]);

  const links = matchAll(latex, /\\href\{https?:\/\/([^}]+)\}\{\\underline\{([^{}]+)\}/g).map((match) => unescapeLatex(match[2] || match[1]));
  model.contact.linkedin = links.find((link) => link.toLowerCase().includes('linkedin')) || model.contact.linkedin;
  model.contact.github = links.find((link) => link.toLowerCase().includes('github')) || model.contact.github;

  const centerMatch = latex.match(/\\begin\{center\}([\s\S]*?)\\end\{center\}/);
  if (centerMatch) {
    const plainContact = unescapeLatex(centerMatch[1].replace(/\\href\{[^}]*\}\{([^}]*)\}/g, '$1').replace(/\$?\|?\$?/g, '|'));
    const phoneMatch = plainContact.match(/(?:\+?\d[\d\s().-]{6,}\d)/);
    if (phoneMatch) model.contact.phone = phoneMatch[0].trim();
  }

  getSectionBlocks(latex).forEach((block, index) => {
    const type = typeFromTitle(block.title);
    if (!type) return;
    const id = `${type}-${index}`;

    if (type === 'summary') {
      const bullets = parseBulletsAfter(block.text, 0);
      const content = unescapeLatex(
        block.text
          .replace(/\\section\{[^{}]*\}/, '')
          .replace(/%---[\s\S]*$/g, '')
          .replace(/\\vspace\{[^{}]*\}/g, '')
          .replace(/\\small\{([\s\S]*)\}/, '$1')
          .replace(/\\resumeItemListStart|\\resumeItemListEnd/g, '')
          .replace(/\\resumeItem\{[^{}]*\}/g, '')
      );
      model.sections.push({
        id: 'summary',
        type,
        title: SECTION_TITLES.summary,
        bullets: bullets.length ? bullets : [content].filter(Boolean),
      });
      return;
    }

    if (type === 'experience') {
      const starts = matchAll(block.text, /\\resumeSubheading\s*\n?\s*\{([^{}]*)\}\{([^{}]*)\}\s*\n?\s*\{([^{}]*)\}\{([^{}]*)\}/g);
      const items = starts.length ? starts.map((match) => ({
        role: unescapeLatex(match[1]),
        dates: unescapeLatex(match[2]),
        company: unescapeLatex(match[3]),
        location: unescapeLatex(match[4]),
        bullets: parseBulletsAfter(block.text, match.index),
      })) : parseRoleMacroItems(block.text).concat(parseClassicHeadingItems(block.text, ['role', 'dates', 'company']));
      model.sections.push({ id, type, title: block.title, items });
      return;
    }

    if (type === 'education') {
      const items =
        parseBracedCommandItems(block.text, 'resumeSubheading', ['school', 'location', 'degree', 'dates'])
          .concat(parseClassicEducationItems(block.text));
      model.sections.push({ id, type, title: block.title, items });
      return;
    }

    if (type === 'projects') {
      const starts = matchAll(block.text, /\\resumeProjectHeading\s*\n?\s*\{\s*\\textbf\{([^{}]*)\}\s*\$\|\$\s*\\emph\{([^{}]*)\}\s*\}\s*\{([^{}]*)\}/g);
      const items = starts.map((match) => ({
        name: unescapeLatex(match[1]),
        stack: unescapeLatex(match[2]),
        dates: unescapeLatex(match[3]),
        bullets: parseBulletsAfter(block.text, match.index),
      }));
      model.sections.push({ id, type, title: block.title, items });
      return;
    }

    const groups = matchAll(block.text, /\\textbf\{([^{}]*)\}\{:\s*([^{}\\]*(?:\\.[^{}\\]*)*)\}/g)
      .map((match) => ({ label: unescapeLatex(match[1]), value: unescapeLatex(match[2]).replace(/\\\\$/, '').trim() }));
    model.sections.push({ id, type, title: block.title, groups: groups.length ? groups : parseClassicSkills(block.text) });
  });

  model.sections = normalizeSections(model.sections);
  return model.sections.length ? model : null;
};
