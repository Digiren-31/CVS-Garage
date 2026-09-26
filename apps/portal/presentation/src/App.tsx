import { useEffect, useReducer, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Button, Tab, TabList } from '@fluentui/react-components';
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { AreaProvider, areaIdentities, useAppearance, type AppearancePreference } from '@cvs-garage/ui/presentation';
import { DemoWorkspace } from './DemoWorkspace';
import { services, storySteps, type ServiceId } from './data';
import { createDemoState, demoReducer } from './demo-state';

const asset = (filename: string) => `${import.meta.env.BASE_URL}images/${filename}`;

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reducedMotion = useReducedMotion();
  return <motion.div className={className} initial={reducedMotion ? false : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }}>{children}</motion.div>;
}

function ThemeChoice() {
  const { preference, setPreference } = useAppearance();
  return <div className="theme-choice"><span>Appearance</span><TabList size="small" selectedValue={preference} onTabSelect={(_, data) => setPreference(data.value as AppearancePreference)} aria-label="Appearance">
    <Tab value="light">Light</Tab><Tab value="dark">Dark</Tab><Tab value="system">System</Tab>
  </TabList></div>;
}

export function App() {
  const [activeService, setActiveService] = useState<ServiceId>('projects');
  const [state, dispatch] = useReducer(demoReducer, undefined, createDemoState);
  const [message, setMessage] = useState('');
  const [story, setStory] = useState(0);
  const [activeSection, setActiveSection] = useState('the-spaces');
  const [tour, setTour] = useState<number | null>(null);
  const [tourNotes, setTourNotes] = useState(false);
  const [credits, setCredits] = useState(false);
  const reducedMotion = useReducedMotion();
  const statusRef = useRef(0);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 160, damping: 35, restDelta: 0.001 });
  const currentService = services.find((service) => service.id === activeService)!;
  const step = storySteps[story];

  useEffect(() => {
    const sections = document.querySelectorAll('main > section[id]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setActiveSection(entry.target.id); });
    }, { rootMargin: '-20% 0px -55% 0px' });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => window.clearTimeout(statusRef.current), []);

  function announce(next: string) {
    window.clearTimeout(statusRef.current);
    setMessage(next);
    statusRef.current = window.setTimeout(() => setMessage(''), 6500);
  }

  function goTo(id: string) {
    const target = document.getElementById(id);
    target?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
    target?.focus({ preventScroll: true });
  }

  function openSpace(id: ServiceId) {
    setActiveService(id);
    setTour(null);
    goTo('the-spaces');
  }

  function startTour() {
    setActiveService('projects');
    setTour(0);
    setTourNotes(true);
    goTo('the-spaces');
  }

  function nextTour() {
    if (tour === null) return;
    if (tour === services.length - 1) {
      setTour(null);
      setTourNotes(false);
      announce('Six spaces. One campus. That’s CVS Garage — keep exploring, or start again.');
    } else {
      setTour(tour + 1);
      setActiveService(services[tour + 1].id);
    }
  }

  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <motion.div className="reading-progress" style={{ scaleX: reducedMotion ? scrollYProgress : progress }} aria-hidden="true" />
    <header className="site-header">
      <div className="header-inner container">
        <a href="#home" className="wordmark" aria-label="CVS Garage home" onClick={(event) => { event.preventDefault(); goTo('home'); }}><span>cvs</span>garage<span className="wordmark-period">.</span></a>
        <nav aria-label="Main navigation">
          <a href="#the-spaces" aria-current={activeSection === 'the-spaces' ? 'location' : undefined} onClick={(event) => { event.preventDefault(); goTo('the-spaces'); }}>The spaces</a>
          <a href="#the-story" aria-current={activeSection === 'the-story' ? 'location' : undefined} onClick={(event) => { event.preventDefault(); goTo('the-story'); }}>The bigger picture</a>
          <a href="#the-people" aria-current={activeSection === 'the-people' ? 'location' : undefined} onClick={(event) => { event.preventDefault(); goTo('the-people'); }}>The people</a>
        </nav>
        <Button appearance="primary" size="large" className="header-cta" onClick={startTour}>Take a look inside</Button>
      </div>
    </header>

    <main id="main" tabIndex={-1}>
      <section id="home" className="hero container" tabIndex={-1} aria-labelledby="hero-title">
        <div className="hero-copy">
          <motion.p className="hero-eyebrow" initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }}>Your campus. A little more connected.</motion.p>
          <h1 id="hero-title"><motion.span initial={reducedMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>Good things</motion.span><motion.span initial={reducedMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reducedMotion ? 0 : 0.05, duration: 0.28 }}>start</motion.span><motion.span className="hero-title-last" initial={reducedMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reducedMotion ? 0 : 0.1, duration: 0.28 }}>together.</motion.span></h1>
          <p className="hero-description">A place for the things you want to make.<br />And the people who make it worthwhile.</p>
          <div className="hero-actions"><Button size="large" className="hero-primary" onClick={startTour}>Explore CVS Garage</Button><a href="#the-story" onClick={(event) => { event.preventDefault(); goTo('the-story'); }}>See how it comes together</a></div>
          <p className="hero-footnote">One campus. Six spaces. Your own way in.</p>
        </div>
        <div className="hero-visual">
          <motion.div className="hero-image-wrap" initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.32 }}><img src={asset('together.jpg')} alt="Young people sharing ideas around a table in a bright, plant-filled studio" className="hero-image" width="1600" height="1067" fetchPriority="high" /></motion.div>
          <div className="photo-caption"><span>The best part of campus?</span><p>Each other.</p></div>
          <div className="hero-photo-note"><span>For the curious. The doers. The not-quite-sure-yet.</span><span>There’s room for you.</span></div>
        </div>
      </section>

      <div className="service-index container" aria-label="Explore the six spaces"><p>Find your<br /><strong>kind of thing.</strong></p><div className="service-index-items">{services.map((service) => <button key={service.id} onClick={() => openSpace(service.id)} style={{ '--service-seed': areaIdentities[service.id].seed } as CSSProperties}><span className="index-line" aria-hidden="true" /><span className="index-verb">{service.verb}</span><span className="index-name">{service.name}</span></button>)}</div></div>

      <section className="intro-section container" aria-labelledby="intro-title"><Reveal className="intro-grid"><p className="section-index">A shared starting point</p><div><h2 id="intro-title">Less searching.<br />More <span className="soft-emphasis">finding your people.</span></h2><p>Campus life happens everywhere. The group chats, the noticeboards, the “you should’ve been there.” CVS Garage brings the possibilities a little closer, so you can spend less time keeping up and more time getting involved.</p></div></Reveal></section>

      <section id="the-spaces" className="spaces-section container" tabIndex={-1} aria-labelledby="spaces-title">
        <Reveal className="section-heading"><div><p className="section-index">01 / The spaces</p><h2 id="spaces-title">Different ways in.<br />The same sense of belonging.</h2></div><p>Not six separate destinations.<br />Six sides of campus life, connected.</p></Reveal>
        <div className="service-tabs-wrap"><TabList selectedValue={activeService} onTabSelect={(_, data) => { setActiveService(data.value as ServiceId); setTour(null); }} size="large" aria-label="Campus spaces" className="service-tabs">
          {services.map((service) => <Tab key={service.id} id={`tab-${service.id}`} value={service.id} aria-controls="service-panel"><span className="service-tab-number" aria-hidden="true">{service.number}</span>{service.name}</Tab>)}
        </TabList></div>
        {tour !== null && <div className="tour-bar"><div><span className="tour-step">The guided look · {tour + 1} of 6</span><p>{currentService.name === 'Projects' ? 'Join a project. Your profile remembers where you’ve been.' : currentService.description}</p></div><div className="tour-actions"><Button appearance="transparent" onClick={() => { setTour(null); setTourNotes(false); }}>End tour</Button><Button appearance="outline" onClick={nextTour}>{tour === 5 ? 'Finish tour' : 'Next space'}</Button></div></div>}
        <AreaProvider area={activeService} className="service-stage">
          <div id="service-panel" role="tabpanel" aria-labelledby={`tab-${activeService}`} tabIndex={0}>
            <div className="service-overview"><AnimatePresence mode="wait" initial={false}><motion.div key={activeService} initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.16 }} className="service-editorial"><p className="service-kicker">{currentService.number} / {currentService.name}</p><h3>{currentService.title}</h3><p>{currentService.description}</p><div className="service-editorial-bottom"><span className="editorial-rule" /><p>{currentService.detail}</p></div></motion.div></AnimatePresence><div className="demo-workspace"><div className="workspace-topline"><span>CVS Garage / {currentService.name}</span><span>Interactive preview</span></div><motion.div key={activeService} initial={{ opacity: 0, y: reducedMotion ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.2 }}><DemoWorkspace service={activeService} state={state} dispatch={dispatch} announce={announce} /></motion.div></div></div>
          </div>
        </AreaProvider>
        <div className="demo-disclosure"><p>A working little preview. All people, activity, and numbers here are illustrative. Changes last until you reload.</p><Button appearance="transparent" className="text-action" onClick={() => { dispatch({ type: 'reset' }); announce('A fresh start. All demo activity has been reset.'); }}>Reset demo</Button></div>
        {tour !== null && tourNotes && <p className="tour-tip">Try a button in the preview. Nothing leaves this page. Use “Next space” to keep the story moving.</p>}
      </section>

      <section id="the-story" className="story-section" tabIndex={-1} aria-labelledby="story-title"><div className="container">
        <Reveal className="section-heading"><div><p className="section-index">02 / The bigger picture</p><h2 id="story-title">A small thought.<br />A much bigger story.</h2></div><p>Here’s what connected could look like.<br />Follow one idea across campus.</p></Reveal>
        <div className="story-layout"><div className="story-nav"><TabList vertical selectedValue={story} onTabSelect={(_, data) => setStory(Number(data.value))} aria-label="The journey of an idea">{storySteps.map((item, index) => <Tab id={`story-tab-${index}`} aria-controls="story-panel" key={item.label} value={index}><span className="story-number">{String(index + 1).padStart(2, '0')}</span><span>{item.label}</span></Tab>)}</TabList><p>From “what if”<br />to “we did that.”</p></div><AreaProvider area={step.area} className="story-content"><div id="story-panel" role="tabpanel" aria-labelledby={`story-tab-${story}`} tabIndex={0}><AnimatePresence mode="wait" initial={false}><motion.div key={story} initial={{ opacity: 0, x: reducedMotion ? 0 : 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.18 }}><p className="story-area">{areaIdentities[step.area].name}</p><h3>{step.title}</h3><p className="story-body">{step.body}</p><Button appearance="outline" onClick={() => openSpace(step.area)}>{step.link}</Button></motion.div></AnimatePresence></div><div className="story-progress" aria-hidden="true">{storySteps.map((item, index) => <span key={item.label} className={index <= story ? 'is-reached' : ''} />)}</div></AreaProvider><figure className="story-photo"><img src={asset('campus.jpg')} alt="Students sitting together on campus, talking and sharing a laptop" width="1000" height="667" loading="lazy" /><figcaption>It starts with a person.<br />It grows with a community.</figcaption></figure></div>
      </div></section>

      <section id="the-people" className="people-section container" tabIndex={-1} aria-labelledby="people-title"><Reveal><div className="section-heading"><div><p className="section-index">03 / The people</p><h2 id="people-title">A campus isn’t a place.<br />It’s the people in it.</h2></div><p>There’s no one way to belong.<br />And no one kind of person who does.</p></div><div className="people-grid"><div><span className="people-number">01</span><h3>The ones just<br />finding their feet.</h3><p>Find a friendly face, ask your first question, or try something you never thought was your thing.</p></div><div><span className="people-number">02</span><h3>The ones with<br />something to make.</h3><p>Give a thought somewhere to grow. Find a team that sees what you see—and a few things you don’t.</p></div><div><span className="people-number">03</span><h3>The ones with<br />something to share.</h3><p>A bit of experience. A useful answer. An hour of your time. The little things that bring everyone further.</p></div></div></Reveal></section>

      <section className="closing-section" aria-labelledby="closing-title"><div className="container closing-inner"><Reveal><p>Curiosity looks good on you.</p><h2 id="closing-title">Your next good thing<br />could start <span>right here.</span></h2><Button size="large" className="hero-primary" onClick={startTour}>Find your way in</Button></Reveal><p className="closing-note">Come with an idea.<br />Come with a question.<br />Just come as you are.</p></div></section>
    </main>

    <footer className="site-footer container"><div className="footer-main"><a href="#home" className="wordmark" onClick={(event) => { event.preventDefault(); goTo('home'); }}><span>cvs</span>garage<span className="wordmark-period">.</span></a><p>One campus. A world of possibility.</p><ThemeChoice /></div><div className="footer-bottom"><p>CVS Garage · A product preview, made for the campus.</p><Button appearance="transparent" className="text-action" aria-expanded={credits} onClick={() => setCredits(!credits)}>{credits ? 'Hide about this preview' : 'About this preview'}</Button><a href="#home" onClick={(event) => { event.preventDefault(); goTo('home'); }}>Back to the beginning</a></div>{credits && <div className="preview-credits"><p>This presentation explores the CVS Garage product direction. Service interactions and sample activity are local demonstrations, not live bookings, published ideas, or real member data.</p><p>Photography from <a href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a>, used under the <a href="https://unsplash.com/license" target="_blank" rel="noreferrer">Unsplash license</a>. Images illustrate community; the people pictured are not represented as CVS students.</p></div>}</footer>
    <div className="announcement-host" role="status" aria-live="polite" aria-atomic="true"><AnimatePresence>{message && <motion.div className="announcement" key={message} initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><p>{message}</p><Button appearance="transparent" onClick={() => setMessage('')} aria-label="Dismiss notification">Close</Button></motion.div>}</AnimatePresence></div>
  </>;
}
