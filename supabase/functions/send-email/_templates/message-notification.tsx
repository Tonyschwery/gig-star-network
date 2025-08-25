import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Button,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface MessageNotificationProps {
  recipientName: string
  senderName: string
  eventType: string
  eventDate: string
  messagePreview: string
  bookingId: string
  appUrl: string
  isFromTalent: boolean
}

export const MessageNotificationEmail = ({
  recipientName,
  senderName,
  eventType,
  eventDate,
  messagePreview,
  bookingId,
  appUrl,
  isFromTalent
}: MessageNotificationProps) => {
  const subject = `New message from ${isFromTalent ? 'talent' : 'booker'}`
  
  return (
    <Html>
      <Head />
      <Preview>New message from {senderName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New Message</Heading>
          <Text style={text}>Hi {recipientName},</Text>
          <Text style={text}>
            You have received a new message from {senderName} regarding your {eventType} event on {eventDate}.
          </Text>
          
          <div style={messageBox}>
            <Text style={messageText}>"{messagePreview}"</Text>
          </div>

          <div style={buttonContainer}>
            <Button
              style={button}
              href={`${appUrl}/talent-dashboard`}
            >
              View Full Conversation
            </Button>
          </div>

          <Text style={footer}>
            Best regards,<br/>
            The Qtalent.live Team
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default MessageNotificationEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
}

const messageBox = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #e9ecef',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
}

const messageText = {
  color: '#495057',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
  fontStyle: 'italic',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#007ee6',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
}

const footer = {
  color: '#898989',
  fontSize: '12px',
  lineHeight: '22px',
  marginTop: '32px',
}