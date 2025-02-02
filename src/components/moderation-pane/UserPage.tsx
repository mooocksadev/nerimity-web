import { USER_BADGES, addBit, hasBit, removeBit } from "@/chat-api/Bitwise";
import { ModerationUser, getUser, getUsersWithSameIPAddress, updateUser } from "@/chat-api/services/ModerationService";
import { createUpdatedSignal } from "@/common/createUpdatedSignal";
import { useWindowProperties } from "@/common/useWindowProperties";
import { A, useParams } from "@solidjs/router";
import { For, Show, createEffect, createSignal, on, onMount } from "solid-js";
import { css, styled } from "solid-styled-components";
import { FlexColumn, FlexRow } from "../ui/Flexbox";
import { Banner } from "../ui/Banner";
import Avatar from "../ui/Avatar";
import RouterEndpoints from "@/common/RouterEndpoints";
import { bannerUrl } from "@/chat-api/store/useUsers";
import Breadcrumb, { BreadcrumbItem } from "../ui/Breadcrumb";
import SettingsBlock from "../ui/settings-block/SettingsBlock";
import Input from "../ui/input/Input";
import Checkbox from "../ui/Checkbox";
import { formatTimestamp } from "@/common/date";
import UnsuspendUsersModal from "./UnsuspendUsersModal";
import SuspendUsersModal from "./SuspendUsersModal";
import { useCustomPortal } from "../ui/custom-portal/CustomPortal";
import Button from "../ui/Button";
import env from "@/common/env";
import Text from "../ui/Text";
import { RawServer, RawUser } from "@/chat-api/RawData";
import { Server, User } from "./ModerationPane";


const UserPageContainer = styled(FlexColumn)`
    height: 100%;
    width: 100%;
    max-width: 900px;
    align-self: center;
    margin-top: 10px;
`;
const UserPageInnerContainer = styled(FlexColumn)`
    margin: 10px;
`;
const UserBannerContainer = styled(FlexRow)`
  display: flex;
  align-items: center;
  margin-left: 30px;
  height: 100%;
  z-index: 11111;
`;
const UserBannerDetails = styled(FlexColumn)`
  margin-left: 20px;
  margin-right: 20px;
  gap: 4px;
  font-size: 18px;
  z-index: 1111;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(20px);
  padding: 10px;
  border-radius: 8px;
`;

const BadgeItemStyles = css`
  && {
    margin: 0;
    &:not(:last-child) {
      border-radius: 0;
    }
    &:last-child {
      border-top-left-radius: 0;
      border-top-right-radius: 0;
    }
  }
`;


const ChangePasswordButton = styled("button")`
  color: var(--primary-color);
  background-color: transparent;
  border: none;
  align-self: flex-start;
  cursor: pointer;
  user-select: none;
  &:hover {
    text-decoration: underline;
  }
`

export default function UserPage() {
  const params = useParams<{ userId: string }>();
  const { width } = useWindowProperties();
  const [requestSent, setRequestSent] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const [showChangePassword, setShowChangePassword] = createSignal(false);


  const [user, setUser] = createSignal<ModerationUser | null>(null);


  const defaultInput = () => ({
    email: user()?.account?.email || '',
    username: user()?.username || '',
    tag: user()?.tag || '',
    badges: user()?.badges || 0,
    emailConfirmed: user()?.account?.emailConfirmed || false,
    newPassword: '',
    password: ''
  })

  const [inputValues, updatedInputValues, setInputValue] = createUpdatedSignal(defaultInput);


  createEffect(on(() => params.userId, () => {
    getUser(params.userId).then(setUser)
  }))

  const requestStatus = () => requestSent() ? 'Saving...' : 'Save Changes';
  const onSaveButtonClicked = async () => {
    if (requestSent()) return;
    setRequestSent(true);
    setError(null);
    const values = updatedInputValues();
    await updateUser(params.userId, values)
      .then(() => {
        getUser(params.userId).then(setUser)
        setInputValue("password", '');
      })
      .catch(err => {
        setInputValue("password", '');
        setError(err.message)
      })
      .finally(() => setRequestSent(false))
  }

  const onBadgeUpdate = (checked: boolean, bit: number) => {
    if (checked) {
      setInputValue('badges', addBit(inputValues().badges, bit))
      return;
    }
    setInputValue('badges', removeBit(inputValues().badges, bit))
  }

  const onChangePasswordClick = () => {
    setInputValue("newPassword", '')
    setShowChangePassword(!showChangePassword())
  }





  return (
    <Show when={user()} keyed>
      <UserPageContainer>
        <UserPageInnerContainer>
          <Banner class={css`margin-bottom: 15px;`} margin={0} maxHeight={200} animate url={bannerUrl(user()!)} hexColor={user()!.hexColor}>
            <UserBannerContainer>
              {user() && <Avatar animate user={user()!} size={width() <= 1100 ? 70 : 100} />}
              <UserBannerDetails>
                <div>{user()!.username}</div>
                <A class={css`font-size: 14px;`} href={RouterEndpoints.PROFILE(user()!.id)}>Visit Profile</A>
              </UserBannerDetails>
            </UserBannerContainer>
          </Banner>
          <Breadcrumb>
            <BreadcrumbItem href={"../../"} icon='home' title="Moderation" />
            <BreadcrumbItem title={user()?.username} icon="person" />
          </Breadcrumb>
          <SettingsBlock label="Email" icon="email">
            <Input value={inputValues().email} onText={v => setInputValue('email', v)} />
          </SettingsBlock>

          <SettingsBlock label="Email Confirmed">
            <Checkbox checked={inputValues().emailConfirmed} onChange={checked => setInputValue("emailConfirmed", checked)} />
        </SettingsBlock>

          <SettingsBlock label="Username" icon="face">
            <Input value={inputValues().username} onText={v => setInputValue('username', v)} />
          </SettingsBlock>
          <SettingsBlock label="Tag" icon="local_offer">
            <Input value={inputValues().tag} onText={v => setInputValue('tag', v)} />
          </SettingsBlock>
          <SettingsBlock icon="badge" label="Badges" header />
          <FlexColumn gap={1}>
            <For each={Object.values(USER_BADGES)} >
              {badge => (
                <SettingsBlock class={BadgeItemStyles} label={badge.name} description={badge.description}>
                  <Checkbox checked={hasBit(inputValues().badges, badge.bit)} onChange={checked => onBadgeUpdate(checked, badge.bit)} />
                </SettingsBlock>
              )
              }
            </For>
          </FlexColumn>
          <ChangePasswordButton onClick={onChangePasswordClick} style={{ "margin-bottom": "5px", "margin-top": "5px" }}>Change Password</ChangePasswordButton>

          <Show when={showChangePassword()}>
            <SettingsBlock icon='password' label='New Password' description='Changing the password will log them out everywhere.'>
              <Input type='password' value={inputValues().newPassword} onText={(v) => setInputValue('newPassword', v)} />
            </SettingsBlock>
          </Show>


          <Show when={Object.keys(updatedInputValues()).length}>
            <SettingsBlock label="Confirm Admin Password" icon="security" class={css`margin-top: 10px;`}>
              <Input type="password" value={inputValues().password} onText={v => setInputValue('password', v)} />
            </SettingsBlock>
            <Show when={error()}><Text color="var(--alert-color)">{error()}</Text></Show>

            <Button iconName='save' label={requestStatus()} class={css`align-self: flex-end;`} onClick={onSaveButtonClicked} />
          </Show>

          <UsersWithSameIPAddress userId={user()?.id!}/>
          <UserServersList userId={user()?.id!} servers={user()?.servers!} />

        <Show when={user()}>
          <SuspendOrUnsuspendBlock user={user()!} setUser={setUser}/>
        </Show>

        </UserPageInnerContainer>
      </UserPageContainer>
    </Show>
  )
}


const UsersWithSameIPAddressContainer = styled(FlexColumn)`
  background: rgba(255, 255, 255, 0.05);
  margin-bottom: 10px;
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  padding: 5px;
`


const UsersWithSameIPAddress = (props: {userId: string}) => {
  const [users, setUsers] = createSignal<ModerationUser[]>([]);
  
  onMount(() => {
    getUsersWithSameIPAddress(props.userId, 30).then(setUsers)
  })

  return (
    <FlexColumn>
      <SettingsBlock icon="dns" header label="Users With Same IP Address"  />
      <UsersWithSameIPAddressContainer>
      <For each={users()}>
        {user => <User user={user} />}
      </For>
      </UsersWithSameIPAddressContainer>
    </FlexColumn>
  )
}
const UserServersList = (props: {userId: string; servers: RawServer & { createdBy: RawUser}[]}) => {

  const sortOwnedFirst = () => {
    return props.servers.sort((a, b) => {
      if (a.createdBy.id === props.userId) return -1;
      if (b.createdBy.id === props.userId) return 1;
      return 0;
    })
  }


  return (
    <FlexColumn>
      <SettingsBlock icon="dns" header label="Joined Servers"  />
      <UsersWithSameIPAddressContainer>
      <For each={sortOwnedFirst()}>
        {server => <Server server={server} />}
      </For>
      </UsersWithSameIPAddressContainer>
    </FlexColumn>
  )
}

function SuspendOrUnsuspendBlock(props: {user: ModerationUser, setUser: (user: ModerationUser) => void}) {
  const { createPortal } = useCustomPortal();

  const showSuspendModal = () => {
    createPortal?.(close => <SuspendUsersModal done={(suspension) => props.setUser({ ...props.user!, suspension })} close={close} users={[props.user]} />)
  }
  const showUnsuspendModal = () => {
    createPortal?.(close => <UnsuspendUsersModal done={() => props.setUser({ ...props.user!, suspension: undefined })} close={close} users={[props.user]} />)
  }
  
  const expiredAt = () => {
    if (!props.user.suspension?.expireAt) return "Never";
 
   return formatTimestamp(props.user.suspension.expireAt); 
  }

  return (
    <>
      <Show when={!props.user?.suspension}>
        <SettingsBlock icon='block' label='Suspend' description={`Deny this user to access ${env.APP_NAME}`}>
          <Button onClick={showSuspendModal} label="Suspend" color="var(--alert-color)" primary />
        </SettingsBlock>
      </Show>

      <Show when={props.user?.suspension}>
        <SettingsBlock icon='block' label={`Suspended for: ${props.user.suspension?.reason}` }  description={`Expires: ${expiredAt()}`}>
          <Button onClick={showUnsuspendModal} label="Unsuspend" color="var(--alert-color)" primary />
        </SettingsBlock>
      </Show>
    </>
  )
}