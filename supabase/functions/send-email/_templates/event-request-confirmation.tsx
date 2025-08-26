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
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface EventRequestConfirmationProps {
  recipientName: string;
  eventData: {
    event_date: string;
    event_duration: number;
    event_location: string;
    event_type: string;
    description?: string;
  };
  appUrl?: string;
}

export const EventRequestConfirmationEmail = ({
  recipientName,
  eventData,
  appUrl = 'https://qtalent.live'
}: EventRequestConfirmationProps) => (
  <Html>
    <Head />
    <Preview>Event Request Confirmation - We received your request!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>✅ Event Request Received!</Heading>
        
        <Text style={text}>
          Hi {recipientName},
        </Text>
        
        <Text style={text}>
          Thank you for submitting your event request! We've received all the details and our team will review it shortly.
        </Text>

        <Section style={section}>
          <Heading style={h2}>Your Event Details</Heading>
          <Text style={detail}>
            <strong>Date:</strong> {new Date(eventData.event_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
          <Text style={detail}>
            <strong>Duration:</strong> {eventData.event_duration} hours
          </Text>
          <Text style={detail}>
            <strong>Location:</strong> {eventData.event_location}
          </Text>
          <Text style={detail}>
            <strong>Event Type:</strong> {eventData.event_type}
          </Text>
          {eventData.description && (
            <Text style={detail}>
              <strong>Description:</strong><br />
              {eventData.description}
            </Text>
          )}
        </Section>

        <Hr style={hr} />

        <Text style={text}>
          <strong>What happens next?</strong>
        </Text>
        
        <Text style={text}>
          • Our team will review your request within 24 hours<br />
          • We'll match you with the perfect talent for your event<br />
          • You'll receive a follow-up email with talent suggestions and next steps
        </Text>

        <Section style={section}>
          <Link
            href={`${appUrl}/booker-dashboard`}
            style={button}
          >
            View Your Requests
          </Link>
        </Section>

        <Text style={footer}>
          If you have any questions, feel free to reply to this email or contact us at support@qtalent.live
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EventRequestConfirmationEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '580px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
}

const h2 = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '20px 0 10px 0',
  padding: '0',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
}

const detail = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
}

const section = {
  padding: '24px',
  backgroundColor: '#f9f9f9',
  borderRadius: '8px',
  margin: '16px 0',
}

const hr = {
  borderColor: '#cccccc',
  margin: '20px 0',
}

const button = {
  backgroundColor: '#007ee6',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  margin: '16px 0',
}

const footer = {
  color: '#898989',
  fontSize: '12px',
  lineHeight: '22px',
  marginTop: '32px',
  textAlign: 'center' as const,
}