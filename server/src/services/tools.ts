/**
 * Real backend logic for the three Actions/Tools examples. Called both by the REST endpoints
 * (POST /api/tools/*) and, indirectly, by the agent's tool() functions (agent/src/tools/*.ts),
 * which hit these same endpoints over HTTP — one implementation, no duplicated business logic.
 *
 * Weather calls a real external API (Open-Meteo; no key required, or OpenWeatherMap if
 * OPENWEATHER_API_KEY is set). Appointment booking and order lookup run real SQL against
 * Postgres, but the *data* is a seeded demo dataset — see prisma/schema.prisma's comment on
 * DemoOrder/Appointment and CAPABILITIES in packages/shared for why that distinction matters.
 */
import { randomUUID } from 'node:crypto';
import type { AppointmentInput, AppointmentOutput, OrderLookupOutput, WeatherInput, WeatherOutput } from '@voicelab/shared';
import { env } from '../config/env.js';
import { prisma } from '../db/client.js';

export class ToolExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolExecutionError';
  }
}

async function geocodeCity(city: string): Promise<{ lat: number; lon: number; name: string }> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', city);
  url.searchParams.set('count', '1');
  const res = await fetch(url);
  if (!res.ok) throw new ToolExecutionError(`Geocoding failed for "${city}" (${res.status})`);
  const data = (await res.json()) as { results?: { latitude: number; longitude: number; name: string }[] };
  const first = data.results?.[0];
  if (!first) throw new ToolExecutionError(`Could not find a location named "${city}"`);
  return { lat: first.latitude, lon: first.longitude, name: first.name };
}

const WMO_CONDITIONS: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Depositing rime fog',
  51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
  61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
  80: 'Rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail',
};

export async function getWeather(input: WeatherInput): Promise<WeatherOutput> {
  if (env.OPENWEATHER_API_KEY) {
    const url = new URL('https://api.openweathermap.org/data/2.5/weather');
    url.searchParams.set('q', input.city);
    url.searchParams.set('appid', env.OPENWEATHER_API_KEY);
    url.searchParams.set('units', 'metric');
    const res = await fetch(url);
    if (!res.ok) throw new ToolExecutionError(`OpenWeatherMap request failed (${res.status})`);
    const data = (await res.json()) as {
      main: { temp: number };
      weather: { description: string }[];
      wind: { speed: number };
      name: string;
    };
    return {
      city: data.name,
      temperatureC: Math.round(data.main.temp * 10) / 10,
      temperatureF: Math.round((data.main.temp * 9) / 5 + 32),
      conditions: data.weather[0]?.description ?? 'unknown',
      windKph: Math.round(data.wind.speed * 3.6 * 10) / 10,
    };
  }

  const loc = await geocodeCity(input.city);
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(loc.lat));
  url.searchParams.set('longitude', String(loc.lon));
  url.searchParams.set('current', 'temperature_2m,weather_code,wind_speed_10m');
  const res = await fetch(url);
  if (!res.ok) throw new ToolExecutionError(`Open-Meteo request failed (${res.status})`);
  const data = (await res.json()) as {
    current: { temperature_2m: number; weather_code: number; wind_speed_10m: number };
  };
  const tempC = data.current.temperature_2m;
  return {
    city: loc.name,
    temperatureC: Math.round(tempC * 10) / 10,
    temperatureF: Math.round((tempC * 9) / 5 + 32),
    conditions: WMO_CONDITIONS[data.current.weather_code] ?? `Weather code ${data.current.weather_code}`,
    windKph: Math.round(data.current.wind_speed_10m * 10) / 10,
  };
}

export async function bookAppointment(input: AppointmentInput): Promise<AppointmentOutput> {
  const confirmationId = `APT-${randomUUID().slice(0, 8).toUpperCase()}`;
  await prisma.appointment.create({
    data: { confirmationId, customer: input.customer, date: input.date, time: input.time, service: input.service },
  });
  return { confirmationId, customer: input.customer, date: input.date, time: input.time, service: input.service, status: 'confirmed' };
}

export async function lookupOrder(orderId: string): Promise<OrderLookupOutput> {
  const order = await prisma.demoOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new ToolExecutionError(`No order found with ID "${orderId}"`);
  return {
    orderId: order.id,
    status: order.status,
    items: order.items as { name: string; quantity: number }[],
    total: order.total,
    estimatedDelivery: order.estimatedDelivery?.toISOString().slice(0, 10) ?? null,
  };
}
