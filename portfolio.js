const github = 'https://github.com/AbaD3v/';
const hf = 'https://huggingface.co/';
const sites = '.auburnbrass1.chatgpt.site';

const repo = (name, label = 'GitHub') => [label, github + name];
const site = (slug, label) => [label, 'https://' + slug + sites];

const categories = {
  ai: 'ИИ и данные',
  web: 'Веб',
  edu: 'Обучение',
  other: 'Другие',
};

const projects = [
  {
    name: 'Voxa', categories: ['ai', 'edu'],
    description: 'Голосовой тренажёр русского, английского и казахского. Можно выбрать сценарий, например собеседование или путешествие, поговорить с ИИ и разобрать ошибки после диалога. Моя роль — основатель и ведущий разработчик.',
    stack: ['React', 'FastAPI'],
    demo: ['Открыть Voxa', 'https://aba-d3v-frontend.vercel.app'],
    links: [repo('AbaD3v-Frontend'), ['Голосовой движок', hf + 'spaces/AbaD3v/voxa-voice-engine']],
  },
  {
    name: 'CodeProof SQL', categories: ['web', 'edu'],
    description: 'Практикум из 15 задач на пяти связанных таблицах интернет-магазина. Запросы выполняются в браузере, а ответы проверяются на нескольких наборах данных.',
    stack: ['SQLite', 'WebAssembly', 'CodeMirror'],
    demo: site('codeproof-sql-practicum', 'Открыть практикум'),
    links: [repo('AbaD3v-AIU')],
  },
  {
    name: 'AgroAI', categories: ['ai'],
    description: 'Платформа для анализа заявок на сельхозсубсидии. Подготавливает данные, рассчитывает оценку заявок с помощью CatBoost и анализирует их с Qwen 2.5 через Ollama.',
    stack: ['Next.js', 'Python', 'CatBoost', 'Qwen', 'Ollama'],
    links: [repo('AgroAI')],
  },
  {
    name: 'EvoMind', categories: ['ai', 'web'],
    description: 'Веб-интерфейс для общения с MoonAI на базе Qwen3. История диалогов позволяет возвращаться к предыдущим беседам.',
    stack: ['JavaScript', 'MoonAI', 'Qwen3'],
    demo: ['Открыть чат', 'https://evomind-two.vercel.app'],
    links: [repo('EvoMind'), ['Модель на Hugging Face', hf + 'spaces/AbaD3v/MoonAI-8B_qlora_Qwen3']],
  },
  {
    name: 'MoonAI', categories: ['ai'],
    description: 'Серия экспериментов с языковыми моделями. В веб-демо можно опробовать раннюю модель на 729 млн параметров. Другие версии и датасеты собраны на Hugging Face.',
    stack: ['React', 'TypeScript', 'Tauri'],
    demo: ['Открыть демо', 'https://moonai-psi.vercel.app'],
    links: [repo('moonai'), ['Модели', '#models']],
  },
  {
    name: 'Democracy.kz AI', categories: ['ai', 'web'],
    description: 'Бэкенд чат-бота ищет данные в Supabase и передаёт их Gemini для формирования ответа. Ответы поступают пользователю по мере генерации.',
    stack: ['Python', 'FastAPI', 'Supabase', 'Gemini'],
    links: [repo('DemocracyKzAI')],
  },
  {
    name: 'Ақ-Бота', categories: ['web'],
    description: 'Двуязычный сайт детского сада, который я сделал на заказ. Родители могут узнать о группах и кружках и найти материалы детского сада.',
    demo: ['Открыть сайт', 'https://aq-bota.kz/'],
    links: [repo('Aq-bota')],
  },
  {
    name: 'Korshi.kz', categories: ['web'],
    description: 'Личный MVP для поиска соседей по аренде жилья. Опубликовал веб-версию и отдельно собрал демо чат-бота на Hugging Face.',
    stack: ['Next.js', 'TypeScript', 'Prisma'],
    demo: ['Открыть Korshi.kz', 'https://www.korshikz.space/'],
    links: [repo('korshikz', 'Код MVP'), repo('korshi', 'Ранняя версия'), ['Чат-бот', hf + 'spaces/AbaD3v/korshikz-chatbot']],
  },
  {
    name: 'Q’fly', categories: ['web'],
    description: 'Веб-проект для сервиса доставки небольших посылок дронами в Астане. В интерфейсе можно посмотреть, как устроена доставка, и открыть карту.',
    stack: ['Next.js', 'TypeScript', 'Supabase', '2GIS'],
    demo: ['Открыть Q’fly', 'https://qfly.vercel.app'],
    links: [repo('qfly')],
  },
  {
    name: 'MsDent', categories: ['web'],
    description: 'Сайт стоматологии с услугами и онлайн-записью. В коде проекта предусмотрена интеграция оплаты через Stripe.',
    stack: ['React', 'Express', 'Stripe'],
    demo: ['Открыть сайт', 'https://nt-smoky-one.vercel.app'],
    links: [repo('nt')],
  },
  {
    name: 'SmartShop', categories: ['web'],
    description: 'Интернет-магазин смартфонов. Покупатель может выбрать товар в каталоге, добавить его в корзину и оформить самовывоз. Пункты выдачи собраны на карте.',
    stack: ['Next.js', 'Supabase', 'Leaflet'],
    demo: ['Открыть магазин', 'https://smart-shop-eta-five.vercel.app'],
    links: [repo('SmartShop')],
  },
  {
    name: 'BilimShare', categories: ['web', 'edu'],
    description: 'Платформа для обмена учебными материалами. Пользователи могут делиться ресурсами и обсуждать их.',
    stack: ['React', 'Vite', 'Supabase'],
    demo: ['Открыть BilimShare', 'https://aba-app-gules.vercel.app'],
    links: [repo('aba-app')],
  },
  {
    name: 'DidaType', categories: ['web', 'edu'],
    description: 'Тренажёр для проверки скорости и точности печати. После теста показывает результат по скорости и ошибкам.',
    stack: ['Next.js', 'TypeScript', 'Supabase'],
    demo: ['Пройти тест', 'https://dida-type.vercel.app'],
    links: [repo('DidaType')],
  },
  {
    name: 'English Course', categories: ['web', 'edu'],
    description: 'Учебная платформа по английскому языку с уроками, распределёнными по уровням.',
    stack: ['Next.js', 'TypeScript', 'Supabase'],
    demo: ['Открыть курс', 'https://english-course-pied.vercel.app'],
    links: [repo('english-course')],
  },
  {
    name: 'Байт — Жүйелік программалау', categories: ['web', 'edu'],
    description: 'Учебный сайт по системному программированию на казахском языке.',
    demo: site('bait-labdesk-24', 'Открыть сайт'),
    links: [],
  },
  {
    name: 'Саясаттану — Тест', categories: ['web', 'edu'],
    description: 'Веб-тест по политологии на казахском языке.',
    stack: ['HTML', 'JavaScript'],
    demo: ['Пройти тест', 'https://project-zlsaf.vercel.app'],
    links: [repo('-')],
  },
  {
    name: 'Саған ғана', categories: ['web'],
    description: 'Веб-приглашение на казахском языке.',
    demo: site('ers-love-letter', 'Открыть приглашение'),
    links: [],
  },
  {
    name: 'Platonus Bot', categories: ['other'],
    description: 'Telegram-бот для мониторинга доступности Platonus.',
    stack: ['Python', 'Telegram'],
    links: [repo('platonusbot')],
  },
  {
    name: 'AbaCode', categories: ['ai'],
    description: 'Эксперименты на Python со скриптами для работы с моделями.',
    stack: ['Python'],
    links: [repo('AbaCode')],
  },
  {
    name: 'Apex Drift Simulator', categories: ['other'],
    description: 'Игровой проект про дрифт для Яндекс Игр.',
    stack: ['Unity'],
    links: [repo('Apex_Drift_Simulator')],
  },
  {
    name: 'Any', categories: ['other'],
    description: 'Прототип браузерной многопользовательской игры.',
    stack: ['Node.js', 'Express', 'Socket.IO'],
    links: [repo('Any')],
  },
  {
    name: 'Ad', categories: ['other'],
    description: 'Игровой прототип для браузера.',
    stack: ['Node.js', 'Express', 'Socket.IO'],
    links: [repo('Ad')],
  },
  ...['online', 'ServerChecker'].map(name => ({
    name, categories: ['other'], description: 'Репозиторий без опубликованного кода.',
    links: [repo(name)],
  })),
  ...['MagneticGame', 'onlinegame', 'cooperativeAbaD3v'].map(name => ({
    name, categories: ['other'], description: 'Приватный репозиторий.',
    links: [repo(name)],
  })),
];

const list = document.querySelector('#project-list');
const count = document.querySelector('#catalog-count');
const empty = document.querySelector('#empty');
const filters = document.querySelector('#filters');
const search = document.querySelector('#query');

const items = projects.map(project => {
  const article = document.createElement('article');
  article.className = 'project';
  const title = document.createElement('h3');
  title.textContent = project.name;
  const details = document.createElement('div');
  details.className = 'project-details';
  const summary = document.createElement('p');
  summary.textContent = project.description;
  details.append(summary);

  if (project.stack?.length) {
    const stack = document.createElement('ul');
    stack.className = 'stack';
    stack.setAttribute('aria-label', 'Технологии');
    for (const technology of project.stack) {
      const item = document.createElement('li');
      item.textContent = technology;
      stack.append(item);
    }
    details.append(stack);
  }

  const links = document.createElement('div');
  links.className = 'project-links';
  const destinations = project.demo ? [project.demo, ...project.links] : project.links;

  for (const destination of destinations) {
    const [label, href] = destination;
    const link = document.createElement('a');
    link.href = href;
    link.textContent = label;
    link.setAttribute('aria-label', `${project.name} · ${label}`);
    if (destination === project.demo) link.className = 'project-demo';
    links.append(link);
  }

  article.append(title, details, links);
  const keywords = [
    project.name,
    project.description,
    ...project.categories.map(key => categories[key]),
    ...(project.stack ?? []),
    ...destinations.flat(),
  ].join(' ').toLocaleLowerCase('ru');

  return { article, keywords, categories: project.categories, hasDemo: Boolean(project.demo) };
});

let activeCategory = 'all';

function filterProjects() {
  const terms = search.value.toLocaleLowerCase('ru').trim().split(/\s+/).filter(Boolean);
  let shown = 0;

  for (const { article, keywords, categories, hasDemo } of items) {
    const matchesCategory = activeCategory === 'all'
      || categories.includes(activeCategory)
      || (activeCategory === 'demo' && hasDemo);
    const matchesQuery = terms.every(term => keywords.includes(term));
    article.hidden = !(matchesCategory && matchesQuery);
    if (!article.hidden) shown++;
  }

  count.textContent = `Показано ${shown} из ${items.length}`;
  empty.hidden = shown > 0;
}

const buttons = [...filters.querySelectorAll('[data-category]')];
for (const button of buttons) {
  button.addEventListener('click', () => {
    activeCategory = button.dataset.category;
    for (const option of buttons) {
      option.setAttribute('aria-pressed', String(option === button));
    }
    filterProjects();
  });
}

search.addEventListener('input', filterProjects);
list.append(...items.map(item => item.article));
filters.hidden = false;
filterProjects();
