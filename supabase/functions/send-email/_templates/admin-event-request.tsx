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

interface AdminEventRequestProps {
  eventData: {
    booker_name: string;
    booker_email: string;
    event_date: string;
    event_duration: number;
    event_location: string;
    event_type: string;
    description?: string;
    user_id: string;
  };
  appUrl?: string;
}

export const AdminEventRequestEmail = ({
  eventData,
  appUrl = 'https://qtalent.live'
}: AdminEventRequestProps) => (
  <Html>
    <Head />
    <Preview>New Event Request from {eventData.booker_name}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🎉 New Event Request</Heading>
        
        <Text style={text}>
          A new event request has been submitted through the "Sign up & tell us about your event" form.
        </Text>

        <Section style={section}>
          <Heading style={h2}>Contact Information</Heading>
          <Text style={detail}>
            <strong>Name:</strong> {eventData.booker_name}
          </Text>
          <Text style={detail}>
            <strong>Email:</strong> {eventData.booker_email}
          </Text>
          <Text style={detail}>
            <strong>User ID:</strong> {eventData.user_id}
          </Text>
        </Section>

        <Hr style={hr} />

        <Section style={section}>
          <Heading style={h2}>Event Details</Heading>
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

        <Section style={section}>
          <Link
            href={`${appUrl}/admin`}
            style={button}
          >
            Open Admin Dashboard
          </Link>
        </Section>

        <Text style={footer}>
          This email was sent from the QTalents platform. Please respond to this event request through the admin panel.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default AdminEventRequestEmail

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