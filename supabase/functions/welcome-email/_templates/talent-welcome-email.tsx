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

interface TalentWelcomeEmailProps {
  artistName: string
  userEmail: string
  appUrl: string
}

export const TalentWelcomeEmail = ({
  artistName,
  userEmail,
  appUrl
}: TalentWelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Congratulations! Your talent profile is now live on Qtalent.live</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🎊 Congratulations, {artistName}!</Heading>
          
          <Text style={text}>
            Your talent profile is now <strong>LIVE</strong> on Qtalent.live! 
          </Text>
          
          <Text style={text}>
            Event organizers worldwide can now discover your unique talents and book you for their events. 
            Your profile showcases your skills, experience, and what makes you special.
          </Text>

          <Section style={successBox}>
            <Text style={successTitle}>
              ✨ Your Profile is Ready!
            </Text>
            <Text style={smallText}>
              🎯 <strong>Visible to Event Organizers:</strong> Your profile is now searchable by clients<br/>
              📬 <strong>Receive Booking Requests:</strong> Get notified when clients want to book you<br/>
              💬 <strong>Direct Communication:</strong> Chat directly with potential clients<br/>
              💰 <strong>Secure Payments:</strong> Get paid safely through our platform
            </Text>
          </Section>

          <div style={buttonContainer}>
            <Button
              style={button}
              href={`${appUrl}/talent-dashboard`}
            >
              View Your Profile
            </Button>
          </div>

          <Hr style={hr} />

          <Section style={tipsBox}>
            <Text style={tipsTitle}>💡 Tips for Success:</Text>
            <Text style={smallText}>
              • Keep your profile updated with your latest work<br/>
              • Respond quickly to booking inquiries<br/>
              • Upload high-quality photos and videos<br/>
              • Set competitive rates for your market<br/>
              • Maintain professionalism in all communications
            </Text>
          </Section>

          <Text style={text}>
            We're excited to see the amazing connections you'll make and the successful events you'll be part of!
          </Text>

          <Text style={footer}>
            Best of luck,<br/>
            The Qtalent.live Team<br/>
            <Link href={appUrl} style={link}>qtalent.live</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default TalentWelcomeEmail

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

const successBox = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const successTitle = {
  color: '#15803d',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
}

const tipsBox = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fed7aa',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const tipsTitle = {
  color: '#d97706',
  fontSize: '16px',
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
  backgroundColor: '#10b981',
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