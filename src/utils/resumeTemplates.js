export const resumeTemplates = {
  blank: {
    name: "New Blank Document",
    code: `\\documentclass[letterpaper,11pt]{article}
\\begin{document}

% Type or paste your LaTeX code here...
Hello World!

\\end{document}
`
  },
  jake: {
    name: "Jake's Resume (ATS-Friendly, Classic)",
    code: `%-------------------------
% Resume in Latex
% Author : Jake Gutierrez
% Based off of: https://github.com/sb2nov/resume
% License : MIT
%------------------------

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
\\fancyhf{} % clear all header and footer fields
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Adjust margins
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}

\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

% Sections formatting
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

% Ensure that generate pdf is machine readable/ATS parsable
\\pdfgentounicode=1

%-------------------------
% Custom commands
\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubSubheading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\textit{\\small#1} & \\textit{\\small #2} \\\\
    \\end{tabular*}\\vspace{-7pt}
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

%-------------------------------------------
%%%%%%  RESUME STARTS HERE  %%%%%%%%%%%%%%%%%%%%%%%%%%%%


\\begin{document}

%----------HEADING----------
\\begin{center}
    \\textbf{\\Huge \\scshape Firstname Lastname} \\\\ \\vspace{1pt}
    \\small 123-456-7890 $|$ \\href{mailto:email@gmail.com}{\\underline{email@gmail.com}} $|$ 
    \\href{https://linkedin.com/in/...}{\\underline{linkedin.com/in/username}} $|$
    \\href{https://github.com/...}{\\underline{github.com/username}}
\\end{center}


%-----------EDUCATION-----------
\\section{Education}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {University Name}{City, State}
      {Bachelor of Science in Computer Science}{Aug. 2018 -- Dec. 2021}
    \\resumeSubheading
      {Community College}{City, State}
      {Associate of Science in Computer Science}{Aug. 2016 -- May 2018}
  \\resumeSubHeadingListEnd


%-----------EXPERIENCE-----------
\\section{Experience}
  \\resumeSubHeadingListStart

    \\resumeSubheading
      {Undergraduate Research Assistant}{June 2020 -- Present}
      {University Lab}{City, State}
      \\resumeItemListStart
        \\resumeItem{Developed a research application using Python and Django, enabling efficient data visualization for over 200 researchers.}
        \\resumeItem{Optimized database queries, reducing load times by 40\\% and increasing concurrent user capacity.}
      \\resumeItemListEnd
      
    \\resumeSubheading
      {Software Engineer Intern}{May 2019 -- Aug. 2019}
      {Tech Company}{City, State}
      \\resumeItemListStart
        \\resumeItem{Collaborated with a team of 5 engineers to build a dashboard using React and Node.js.}
        \\resumeItem{Implemented unit tests, increasing overall code coverage from 65\\% to 80\\%.}
      \\resumeItemListEnd

  \\resumeSubHeadingListEnd


%-----------PROJECTS-----------
\\section{Projects}
    \\resumeSubHeadingListStart
      \\resumeProjectHeading
          {\\textbf{GitTracker} $|$ \\emph{React, Node.js, GitHub API}}{June 2020 -- Present}
          \\resumeItemListStart
            \\resumeItem{Built a tool that visualizes repository activity using graphs and charts.}
            \\resumeItem{Secured user data using OAuth2 and encrypting session tokens.}
          \\resumeItemListEnd
      \\resumeProjectHeading
          {\\textbf{Task Manager API} $|$ \\emph{Python, Flask, PostgreSQL}}{Jan. 2020 -- May 2020}
          \\resumeItemListStart
            \\resumeItem{Designed and implemented a RESTful API with user authentication and role-based permissions.}
            \\resumeItem{Deployed the application on AWS EC2 with a CI/CD pipeline.}
          \\resumeItemListEnd
    \\resumeSubHeadingListEnd


%-----------PROGRAMMING SKILLS-----------
\\section{Technical Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
     \\textbf{Languages}{: Python, Java, C++, HTML/CSS, JavaScript, SQL} \\\\
     \\textbf{Frameworks}{: React, Node.js, Flask, Django, Bootstrap} \\\\
     \\textbf{Developer Tools}{: Git, Docker, Google Cloud Platform, AWS, VS Code} \\\\
     \\textbf{Libraries}{: pandas, NumPy, Matplotlib}
    }}
 \\end{itemize}


%-------------------------------------------
\\end{document}
`
  },
  sansSerif: {
    name: "Modern Sans-Serif (ATS-Friendly)",
    code: `%-------------------------
% Resume in Latex
% Author : Jake Gutierrez (Sans-Serif variation)
% License : MIT
%------------------------

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
% Load sans-serif Roboto font
\\usepackage[sfdefault]{roboto}
\\input{glyphtounicode}

\\pagestyle{fancy}
\\fancyhf{} % clear all header and footer fields
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Adjust margins
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}

\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

% Sections formatting
\\titleformat{\\section}{
  \\vspace{-4pt}\\bfseries\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

% Ensure that generate pdf is machine readable/ATS parsable
\\pdfgentounicode=1

%-------------------------
% Custom commands
\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubSubheading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\textit{\\small#1} & \\textit{\\small #2} \\\\
    \\end{tabular*}\\vspace{-7pt}
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

%-------------------------------------------
%%%%%%  RESUME STARTS HERE  %%%%%%%%%%%%%%%%%%%%%%%%%%%%


\\begin{document}

%----------HEADING----------
\\begin{center}
    \\textbf{\\Huge Jane Doe} \\\\ \\vspace{1pt}
    \\small 987-654-3210 $|$ \\href{mailto:jane.doe@email.com}{\\underline{jane.doe@email.com}} $|$ 
    \\href{https://linkedin.com/in/...}{\\underline{linkedin.com/in/janedoe}} $|$
    \\href{https://github.com/...}{\\underline{github.com/janedoe}}
\\end{center}


%-----------EDUCATION-----------
\\section{Education}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {State University}{City, State}
      {Master of Science in Information Systems}{Sep. 2020 -- June 2022}
    \\resumeSubheading
      {State College}{City, State}
      {Bachelor of Science in Software Engineering}{Sep. 2016 -- June 2020}
  \\resumeSubHeadingListEnd


%-----------EXPERIENCE-----------
\\section{Experience}
  \\resumeSubHeadingListStart

    \\resumeSubheading
      {Senior Frontend Developer}{July 2022 -- Present}
      {InnovateTech Solutions}{City, State}
      \\resumeItemListStart
        \\resumeItem{Architected and migrated legacy applications to React/Next.js, improving page speed by 50\\% and SEO ranking.}
        \\resumeItem{Led a team of 4 engineers to build a custom visual design library, saving developers 10 hours per week.}
      \\resumeItemListEnd
      
    \\resumeSubheading
      {Frontend Developer Intern}{Jan. 2021 -- June 2021}
      {Startup Labs}{City, State}
      \\resumeItemListStart
        \\resumeItem{Developed interactive dashboards with data visualization components using D3.js and React.}
        \\resumeItem{Collaborated with UI/UX designer to translate high-fidelity Figma mockups into pixel-perfect CSS.}
      \\resumeItemListEnd

  \\resumeSubHeadingListEnd


%-----------PROJECTS-----------
\\section{Projects}
    \\resumeSubHeadingListStart
      \\resumeProjectHeading
          {\\textbf{Portfolio Builder} $|$ \\emph{Vite, TailwindCSS, Firebase}}{Jan. 2023}
          \\resumeItemListStart
            \\resumeItem{Developed a web app that helps creators assemble clean portfolios using markdown files.}
          \\resumeItemListEnd
    \\resumeSubHeadingListEnd


%-----------PROGRAMMING SKILLS-----------
\\section{Technical Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
     \\textbf{Languages}{: JavaScript, TypeScript, HTML/CSS, Python, SQL} \\\\
     \\textbf{Frameworks}{: React, Next.js, Node.js, Express, TailwindCSS} \\\\
     \\textbf{Tools}{: Git, npm, Webpack, Vite, Docker, Vercel, Firebase}
    }}
 \\end{itemize}


%-------------------------------------------
\\end{document}
`
  },
  classic: {
    name: "Classic Corporate (ATS-Friendly)",
    code: `%-------------------------
% Resume in Latex
% Author : Classic LaTeX Resume
% License : MIT
%------------------------

\\documentclass[10pt,letterpaper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[english]{babel}
\\usepackage{geometry}
\\usepackage{titlesec}
\\usepackage{color}
\\definecolor{BLACK}{gray}{0}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{tabularx}
\\input{glyphtounicode}

% Page Geometry
\\geometry{
  letterpaper,
  left=0.75in,
  right=0.75in,
  top=0.75in,
  bottom=0.75in
}

\\pdfgentounicode=1

% Sections formatting
\\titleformat{\\section}{
  \\vspace{-2pt}\\bfseries\\large\\uppercase
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-3pt}]

% Disable page numbers
\\pagestyle{empty}

\\begin{document}

%--- HEADER ---
\\begin{center}
  {\\Huge \\bfseries JOHN SMITH} \\\\ \\vspace{4pt}
  123 Main Street, New York, NY 10001 \\\\
  (123) 456-7890 $\\cdot$ \\href{mailto:john.smith@email.com}{john.smith@email.com} $\\cdot$ \\href{https://linkedin.com}{linkedin.com/in/johnsmith}
\\end{center}

%--- PROFESSIONAL SUMMARY ---
\\section{Professional Summary}
\\vspace{3pt}
Highly motivated Software Engineer with 3+ years of experience building reliable and scalable web applications. Proven track record of optimizing backend performance and collaborating with cross-functional teams to deliver projects on time.

%--- EXPERIENCE ---
\\section{Experience}
\\vspace{3pt}

\\textbf{Software Engineer} \\hfill Jan 2021 -- Present \\\\
\\textit{BigTech Corporation, New York, NY}
\\begin{itemize}[noitemsep,topsep=2pt,parsep=2pt,partopsep=2pt,leftmargin=0.2in]
  \\item Design and maintain core REST APIs serving over 10,000 daily active users using Python, Django, and PostgreSQL.
  \\item Reduced database query response times by 35\\% by implementing Redis caching and indexing large tables.
  \\item Mentored 2 junior engineers, improving sprint task completion rates by 15\\% on average.
\\end{itemize}

\\vspace{4pt}

\\textbf{Junior Software Developer} \\hfill Jun 2019 -- Dec 2020 \\\\
\\textit{SmallTech Inc, Austin, TX}
\\begin{itemize}[noitemsep,topsep=2pt,parsep=2pt,partopsep=2pt,leftmargin=0.2in]
  \\item Developed and tested frontend features using React, Bootstrap, and Redux.
  \\item Configured CI/CD pipelines using GitHub Actions, reducing deployment errors by 20\\%.
\\end{itemize}

%--- EDUCATION ---
\\section{Education}
\\vspace{3pt}
\\textbf{B.S. in Computer Science} \\hfill May 2019 \\\\
\\textit{State University, Austin, TX}

%--- SKILLS ---
\\section{Skills}
\\vspace{3pt}
\\begin{tabular}{@{}ll}
  \\textbf{Programming:} & Python, Java, JavaScript, SQL, C++ \\\\
  \\textbf{Web Technologies:} & React, Node.js, HTML5, CSS3, Bootstrap, Django \\\\
  \\textbf{Databases \\& Tools:} & PostgreSQL, MySQL, Git, Docker, AWS, Redis \\\\
\\end{tabular}

\\end{document}
`
  }
};
