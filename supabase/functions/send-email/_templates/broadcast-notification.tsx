import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Hr,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface BroadcastNotificationProps {
  message: string;
  recipientType: string;
  appUrl: string;
}

export const BroadcastNotificationEmail = ({
  message,
  recipientType,
  appUrl,
}: BroadcastNotificationProps) => (
  <Html>
    <Head />
    <Preview>Important message from Qtalents</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Qtalents</Heading>
        
        <Section style={messageSection}>
          <Text style={messageText}>
            {message}
          </Text>
        </Section>

        <Hr style={hr} />
        
        <Section style={buttonSection}>
          <Link
            href={appUrl}
            target="_blank"
            style={button}
          >
            Visit Qtalents
          </Link>
        </Section>

        <Text style={footer}>
          This is an important message from the Qtalents team.
        </Text>
        
        <Text style={footer}>
          <Link
            href={appUrl}
            target="_blank"
            style={{ ...link, color: '#898989' }}
          >
            Qtalent.live
          </Link>
          - Connect talents with events
        </Text>
      </Container>
    </Body>
  </Html>
);

export default BroadcastNotificationEmail;

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '580px',
};

const h1 = {
  color: '#333',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const messageSection = {
  padding: '24px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  margin: '24px 0',
};

const messageText = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#000000',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
};

const footer = {
  color: '#898989',
  fontSize: '14px',
  lineHeight: '24px',
  textAlign: 'center' as const,
  marginTop: '12px',
};