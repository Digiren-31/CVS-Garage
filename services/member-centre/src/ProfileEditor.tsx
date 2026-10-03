import {
  Button,
  Field,
  Input,
  Text,
  Textarea,
  makeStyles,
  shorthands,
  tokens
} from '@fluentui/react-components';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../../packages/api-client/src';
import type { Member } from '../../../packages/contracts/src';

const useStyles = makeStyles({
  form: {
    display: 'grid',
    gap: tokens.spacingVerticalL,
    width: '100%'
  },
  split: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: tokens.spacingHorizontalL,
    '@media (max-width: 700px)': { gridTemplateColumns: '1fr' }
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM
  },
  error: {
    color: tokens.colorPaletteRedForeground1,
    ...shorthands.padding(tokens.spacingVerticalS, 0)
  }
});

interface ProfileEditorProps {
  member: Member;
  onSaved: (member: Member) => void;
  onCancel: () => void;
}

export function ProfileEditor({ member, onSaved, onCancel }: ProfileEditorProps) {
  const styles = useStyles();
  const [name, setName] = useState(member.name);
  const [department, setDepartment] = useState(member.department);
  const [batch, setBatch] = useState(member.batch || '');
  const [bio, setBio] = useState(member.bio);
  const [skills, setSkills] = useState(member.skills.join(', '));
  const [avatar, setAvatar] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(member.name);
    setDepartment(member.department);
    setBatch(member.batch || '');
    setBio(member.bio);
    setSkills(member.skills.join(', '));
    setAvatar(null);
    setError(null);
  }, [member]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    let uploadedAvatarId: string | null = null;
    try {
      const uploadedAvatar = avatar
        ? await api.media.upload(avatar, 'avatar')
        : null;
      uploadedAvatarId = uploadedAvatar?.id || null;
      const updated = await api.members.updateProfile({
        name,
        department,
        batch,
        bio,
        skills: skills.split(',').map((skill) => skill.trim()).filter(Boolean),
        ...(uploadedAvatar?.url ? { avatarUrl: uploadedAvatar.url } : {})
      });
      onSaved(updated);
    } catch (requestError) {
      if (uploadedAvatarId) {
        try {
          await api.media.remove(uploadedAvatarId);
        } catch (cleanupError) {
          console.error('The unused avatar upload could not be cleaned up.', cleanupError);
        }
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Your profile could not be updated.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} aria-label="Edit your profile">
      <div className={styles.split}>
        <Field label="Name" required>
          <Input value={name} onChange={(_, data) => setName(data.value)} maxLength={100} />
        </Field>
        <Field label="Department" required>
          <Input
            value={department}
            onChange={(_, data) => setDepartment(data.value)}
            maxLength={120}
          />
        </Field>
        <Field label="Batch or year">
          <Input value={batch} onChange={(_, data) => setBatch(data.value)} maxLength={80} />
        </Field>
        <Field label="Skills" hint="Separate skills with commas.">
          <Input value={skills} onChange={(_, data) => setSkills(data.value)} />
        </Field>
      </div>
      <Field label="Bio">
        <Textarea
          value={bio}
          onChange={(_, data) => setBio(data.value)}
          maxLength={1000}
          resize="vertical"
        />
      </Field>
      <Field label="Profile avatar" hint="JPEG, PNG, WebP, GIF, or AVIF up to 5 MB.">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          onChange={(event) => setAvatar(event.target.files?.[0] || null)}
        />
      </Field>
      {error ? <Text role="alert" className={styles.error}>{error}</Text> : null}
      <div className={styles.actions}>
        <Button type="submit" appearance="primary" disabled={saving}>
          {saving ? 'Saving profile...' : 'Save profile'}
        </Button>
        <Button type="button" onClick={onCancel} disabled={saving}>Cancel</Button>
      </div>
    </form>
  );
}
