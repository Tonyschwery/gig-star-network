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
  Section,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface WelcomeEmailProps {
  userEmail: string
  firstName: string
  appUrl: string
}

export const WelcomeEmail = ({
  userEmail,
  firstName,
  appUrl
}: WelcomeEmailProps) => {
  const displayName = firstName || userEmail.split('@')[0]
  
  return (
    <Html>
      <Head />
      <Preview>Welcome to Qtalent.live - Your journey starts here!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to Qtalent.live! 🎉</Heading>
          
          <Text style={text}>Hi {displayName},</Text>
          
          <Text style={text}>
            Welcome to Qtalent.live, the premier platform connecting exceptional talent with event organizers worldwide. We're thrilled to have you join our community!
          </Text>

          <Section style={highlightBox}>
            <Text style={highlightText}>
              🌟 <strong>What's Next?</strong>
            </Text>
            <Text style={smallText}>
              • Explore talented performers for your events<br/>
              • Connect with event organizers looking for your skills<br/>
              • Build meaningful connections in the entertainment industry<br/>
              • Discover exciting opportunities worldwide
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={text}>
            <strong>Need Help?</strong><br/>
            Our support team is here to help you make the most of your Qtalent.live experience. 
            Feel free to reach out if you have any questions.
          </Text>

          <Text style={footer}>
            Best regards,<br/>
            The Qtalent.live Team<br/>
            <Link href={appUrl} style={link}>qtalent.live</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default WelcomeEmail

const main = {
  backgroundColor: '#f8fafc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
}

const h1 = {
  color: '#1f2937',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 30px 0',
  textAlign: 'center' as const,
}

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
}

const highlightBox = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #e0f2fe',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const highlightText = {
  color: '#0369a1',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
}

const smallText = {
  color: '#475569',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
  border: 'none',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
}

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
}

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '22px',
  marginTop: '32px',
  textAlign: 'center' as const,
}