import { useId, useState, type Dispatch, type FormEvent } from 'react';
import {
  Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle,
  Field, Input, Tab, TabList, Textarea,
} from '@fluentui/react-components';
import { motion, useReducedMotion } from 'framer-motion';
import { sampleEvents, sampleThreads, type ServiceId } from './data';
import type { DemoAction, DemoState } from './demo-state';

interface Props {
  service: ServiceId;
  state: DemoState;
  dispatch: Dispatch<DemoAction>;
  announce: (message: string) => void;
}

type Editor = 'project' | 'idea' | 'profile' | null;

export function DemoWorkspace({ service, state, dispatch, announce }: Props) {
  const [editor, setEditor] = useState<Editor>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [period, setPeriod] = useState('month');
  const [scoreDetails, setScoreDetails] = useState(false);
  const reduceMotion = useReducedMotion();
  const formId = useId();

  function openEditor(next: Editor) {
    setName(next === 'profile' ? state.profile.name : '');
    setDescription(next === 'profile' ? state.profile.about : '');
    setError('');
    setEditor(next);
  }

  function submitEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length < 2 || description.trim().length < 8) {
      setError('Add a name of at least 2 characters and a description of at least 8 characters.');
      return;
    }
    const id = crypto.randomUUID();
    if (editor === 'project') {
      dispatch({ type: 'add-project', project: { id, name: name.trim(), description: description.trim(), members: 0 } });
      announce(`“${name.trim()}” is ready to explore. Your demo project has been created.`);
    } else if (editor === 'idea') {
      dispatch({ type: 'add-idea', idea: { id, name: name.trim(), description: description.trim(), supporters: 0 } });
      announce(`“${name.trim()}” has a place to begin. Your demo idea has been added.`);
    } else {
      dispatch({ type: 'profile', profile: { name: name.trim(), about: description.trim() } });
      announce('A little more you. Your demo profile is updated.');
    }
    setEditor(null);
  }

  const thread = sampleThreads.find((item) => item.id === threadId);
  const ranks = period === 'month'
    ? [{ name: 'Open Studio', detail: 'Making room for creativity', score: 240 }, { name: 'Green Campus Collective', detail: 'Small changes, shared progress', score: 192 }, { name: 'Radio Club', detail: 'Giving campus a voice', score: 156 }]
    : [{ name: 'Green Campus Collective', detail: 'Small changes, shared progress', score: 840 }, { name: 'Open Studio', detail: 'Making room for creativity', score: 768 }, { name: 'Radio Club', detail: 'Giving campus a voice', score: 612 }];

  return (
    <div className="workspace-inner">
      {service === 'projects' && <>
        <div className="workspace-heading">
          <div><p className="eyebrow">Find your next collaboration</p><h4>Built on a good idea.</h4></div>
          <Button appearance="primary" onClick={() => openEditor('project')}>Start a project</Button>
        </div>
        <div className="project-list">
          {state.projects.map((project, index) => {
            const joined = state.joined.includes(project.id);
            return <div className="project-row" key={project.id}>
              <span className="row-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <div className="row-copy"><h5>{project.name}</h5><p>{project.description}</p><span className="row-detail">{project.members + Number(joined)} people making it happen{joined ? ' · Including you' : ''}</span></div>
              <Button appearance="outline" aria-pressed={joined} onClick={() => {
                dispatch({ type: 'join', id: project.id });
                announce(joined ? `You left ${project.name} in this demo.` : `You’re part of ${project.name}. Take a look at your Member Centre.`);
              }}>{joined ? 'Leave project' : 'Join project'}</Button>
            </div>;
          })}
        </div>
        <p className="workspace-endnote">You don’t have to have it all figured out to get involved.</p>
      </>}

      {service === 'events' && <>
        <div className="workspace-heading"><div><p className="eyebrow">October · Sample programme</p><h4>A good reason to show up.</h4></div><span className="workspace-aside">{state.reserved.length} saved</span></div>
        <div className="event-list">
          {sampleEvents.map((event) => {
            const reserved = state.reserved.includes(event.id);
            return <div className="event-row" key={event.id}>
              <div className="event-date"><strong>{event.day}</strong><span>{event.month}</span></div>
              <div className="row-copy"><h5>{event.name}</h5><p>{event.description}</p><span className="row-detail">{event.place} · {event.time}</span></div>
              <Button appearance={reserved ? 'outline' : 'primary'} aria-pressed={reserved} onClick={() => {
                dispatch({ type: 'reserve', id: event.id });
                announce(reserved ? `Your demo seat for ${event.name} has been released.` : `${event.name} is on your demo calendar. No real booking has been made.`);
              }}>{reserved ? 'Release seat' : 'Save a seat'}</Button>
            </div>;
          })}
        </div>
        <p className="workspace-endnote">Something to learn. Someone to meet. A story to take home.</p>
      </>}

      {service === 'member-centre' && <>
        <div className="workspace-heading"><div><p className="eyebrow">Your corner of the campus</p><h4>Make yourself at home.</h4></div><Button appearance="outline" onClick={() => openEditor('profile')}>Edit profile</Button></div>
        <div className="member-intro"><p className="member-greeting">Hello, {state.profile.name}.</p><p>{state.profile.about}</p><span className="row-detail">Sample member · A profile you can make your own</span></div>
        <dl className="member-activity">
          <div><dt>Projects joined</dt><dd>{String(state.joined.length).padStart(2, '0')}</dd></div>
          <div><dt>Events saved</dt><dd>{String(state.reserved.length).padStart(2, '0')}</dd></div>
          <div><dt>Ideas supported</dt><dd>{String(state.supported.length).padStart(2, '0')}</dd></div>
        </dl>
        <p className="workspace-endnote">Try another space. The things you do there find a home here.</p>
      </>}

      {service === 'leaderboards' && <>
        <div className="workspace-heading"><div><p className="eyebrow">A little shared momentum</p><h4>Good work gets seen.</h4></div></div>
        <TabList size="small" selectedValue={period} onTabSelect={(_, data) => setPeriod(String(data.value))} aria-label="Leaderboard period">
          <Tab value="month">This month</Tab><Tab value="all">All time</Tab>
        </TabList>
        <ol className="ranking-list">
          {ranks.map((rank, index) => <li className="ranking-row" key={rank.name}>
            <span className="rank-number">{String(index + 1).padStart(2, '0')}</span>
            <div className="rank-person"><h5>{rank.name}</h5><p>{rank.detail}</p><div className="rank-track" aria-hidden="true"><motion.div initial={false} animate={{ scaleX: rank.score / ranks[0].score }} transition={{ duration: reduceMotion ? 0 : 0.3 }} /></div></div>
            <span className="rank-score">{rank.score}<span>demo points</span></span>
          </li>)}
        </ol>
        <Button appearance="transparent" className="text-action" aria-expanded={scoreDetails} onClick={() => setScoreDetails(!scoreDetails)}>{scoreDetails ? 'Hide scoring note' : 'A note on recognition'}</Button>
        {scoreDetails && <p className="score-note">These are fictional teams and illustrative scores, not an approved college scoring policy. The idea: recognise meaningful participation, not popularity.</p>}
      </>}

      {service === 'idea-centre' && <>
        <div className="workspace-heading"><div><p className="eyebrow">Room for a new possibility</p><h4>What’s on your mind?</h4></div><Button appearance="primary" onClick={() => openEditor('idea')}>Share an idea</Button></div>
        <div className="idea-list">
          {state.ideas.map((idea) => {
            const supported = state.supported.includes(idea.id);
            return <div className="idea-row" key={idea.id}>
              <div className="row-copy"><h5>{idea.name}</h5><p>{idea.description}</p><span className="row-detail">{idea.supporters + Number(supported)} people see the possibility</span></div>
              <Button appearance="outline" aria-pressed={supported} onClick={() => {
                dispatch({ type: 'support', id: idea.id });
                announce(supported ? `Your support for ${idea.name} was removed.` : `You’re helping ${idea.name} find its feet. Demo support added.`);
              }}>{supported ? 'Supported' : 'Support idea'}</Button>
            </div>;
          })}
        </div>
        <p className="workspace-endnote">An unfinished idea is an invitation, not a shortcoming.</p>
      </>}

      {service === 'forum' && <>
        <div className="workspace-heading"><div><p className="eyebrow">The conversation is open</p><h4>A little help goes a long way.</h4></div></div>
        {!thread ? <div className="thread-list">
          {sampleThreads.map((item) => <div className="thread-row" key={item.id}>
            <button className="thread-title" onClick={() => { setThreadId(item.id); setReply(''); }}>{item.title}</button>
            <p>{item.excerpt}</p><span className="row-detail">{item.replies.length + (state.replies[item.id]?.length ?? 0)} {(item.replies.length + (state.replies[item.id]?.length ?? 0)) === 1 ? 'reply' : 'replies'} · Join the conversation</span>
          </div>)}
          <p className="workspace-endnote">No question too small. No experience too ordinary to share.</p>
        </div> : <div className="thread-detail">
          <Button appearance="transparent" className="text-action" onClick={() => setThreadId(null)}>All conversations</Button>
          <h5>{thread.title}</h5><p>{thread.body}</p>
          <div className="replies">{[...thread.replies, ...(state.replies[thread.id] ?? [])].map((item) => <div className="reply" key={item.id}><strong>{item.author}</strong><p>{item.body}</p></div>)}</div>
          <form className="reply-form" onSubmit={(event) => {
            event.preventDefault();
            if (!reply.trim()) return;
            dispatch({ type: 'reply', thread: thread.id, reply: { id: crypto.randomUUID(), author: state.profile.name, body: reply.trim() } });
            setReply('');
            announce('Your reply is part of this demo conversation. Thanks for sharing what you know.');
          }}>
            <Field label="Your reply"><Textarea value={reply} onChange={(_, data) => setReply(data.value)} maxLength={600} resize="vertical" placeholder="Add a thought or a little encouragement…" /></Field>
            <Button type="submit" appearance="primary" disabled={!reply.trim()}>Post reply</Button>
          </form>
        </div>}
      </>}

      <Dialog open={editor !== null} onOpenChange={(_, data) => { if (!data.open) setEditor(null); }}>
        <DialogSurface className="demo-dialog">
          <DialogBody>
            <DialogTitle>{editor === 'project' ? 'Give your project a beginning.' : editor === 'idea' ? 'Make room for your “what if.”' : 'A little more you.'}</DialogTitle>
            <DialogContent>
              <p className="dialog-note">This is a local preview. Use made-up details; nothing is sent or saved to a server.</p>
              <form id={formId} className="editor-form" onSubmit={submitEditor}>
                <Field label={editor === 'profile' ? 'Your display name' : editor === 'idea' ? 'Idea name' : 'Project name'} required>
                  <Input value={name} onChange={(_, data) => setName(data.value)} maxLength={60} />
                </Field>
                <Field label={editor === 'profile' ? 'A little about you' : 'The thought behind it'} required validationState={error ? 'error' : 'none'} validationMessage={error} validationMessageIcon={null}>
                  <Textarea value={description} onChange={(_, data) => setDescription(data.value)} maxLength={300} resize="vertical" />
                </Field>
              </form>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setEditor(null)}>Cancel</Button>
              <Button appearance="primary" type="submit" form={formId}>{editor === 'profile' ? 'Save profile' : editor === 'idea' ? 'Add idea' : 'Create project'}</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
