import React, { useState } from "react";
import { Card, Text, Flex, Button, Container } from "@radix-ui/themes";
import LoadingDialog from "./LoadingDialog";
import type { LabelClient } from "@/types/LabelClient";

interface NewReleaseProps {
  client: LabelClient;
  isAdmin: boolean;
}

const initialFormState = {
  artist_name: "",
  email: "",
  gov_name: "",
  address: "",
  spotify_url: "",
  bandcamp_url: "",
  apple_music_url: "",
  catalog_number: "",
  name: "",
  release_date: "",
  campaign_length: "8",
  mastering_engineer_email: "",
  designer_email: "",
  license_allow_politics: false,
  license_allow_alcohol: false,
  license_allow_pharmaceuticals: false,
  license_allow_fastfood: false,
  license_allow_fastfashion: false,
  services_required: [] as string[],
};

const testData = {
  artist_name: "DJ ojo",
  email: "its.dj.ojo@gmail.com",
  gov_name: "Joe",
  address: "123 Test Street\nTest City, TS 12345",
  spotify_url:
    "https://open.spotify.com/artist/6gnPiTUdUPttmm5N8j7Rvy?si=JxMY6XhgSSy8rv-6XYclPA",
  bandcamp_url: "https://djpitch.bandcamp.com/",
  apple_music_url: "https://music.apple.com/gb/artist/dj-pitch/1468564384",
  catalog_number: "ALT001",
  name: "Test Release",
  release_date: new Date().toISOString().split("T")[0],
  campaign_length: "8",
  mastering_engineer_email: "hello@joecarver.net",
  designer_email: "hello@joecarver.net",
  license_allow_politics: true,
  license_allow_alcohol: true,
  license_allow_pharmaceuticals: false,
  license_allow_fastfood: false,
  license_allow_fastfashion: false,
  services_required: ["Mixing", "Mastering", "Press Release Written"],
};

const serviceOptions = [
  { id: "service_mixing", value: "Mixing", label: "Mixing" },
  { id: "service_mastering", value: "Mastering", label: "Mastering" },
  {
    id: "service_press_release",
    value: "Press Release Written",
    label: "Press Release",
  },
  { id: "service_press", value: "Press", label: "Press" },
  { id: "service_dj_promo", value: "DJ Promo", label: "DJ Promo" },
  { id: "service_sync", value: "Sync", label: "Sync" },
  {
    id: "service_marketing",
    value: "Marketing Driver",
    label: "Marketing Driver",
  },
  {
    id: "service_playlist",
    value: "Playlist Pitching",
    label: "Playlist Pitching",
  },
];

const licenseOptions = [
  { id: "license_allow_politics", label: "Allow Politics" },
  { id: "license_allow_alcohol", label: "Allow Alcohol" },
  { id: "license_allow_pharmaceuticals", label: "Allow Pharmaceuticals" },
  { id: "license_allow_fastfood", label: "Allow Fast Food" },
  { id: "license_allow_fastfashion", label: "Allow Fast Fashion" },
];

export const NewReleaseForm: React.FC<NewReleaseProps> = ({
  client,
  isAdmin,
}) => {
  const [form, setForm] = useState({ ...initialFormState });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const input = e.target as HTMLInputElement;
      const checked = input.checked;
      if (name === "services_required") {
        setForm((prev) => {
          const newServices = checked
            ? [...prev.services_required, value]
            : prev.services_required.filter((v) => v !== value);
          return { ...prev, services_required: newServices };
        });
      } else {
        setForm((prev) => ({ ...prev, [name]: checked }));
      }
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, campaign_length: e.target.value }));
  };

  const handleFillTestData = () => {
    setForm({ ...testData });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const data = {
      ...form,
      client_id: client.id,
      client_folder_id: client.folderId,
      client_name: client.name,
      services_required: form.services_required.join(";"),
    };
    try {
      const response = await fetch("/api/create-release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error);
      }
      window.alert("Release submitted successfully!");
      window.location.href = `/releases/${result.release.id}`;
    } catch (err: any) {
      let message = err?.message || String(err);
      let errorMessage = "Failed to submit release. Please try again.";
      if (message.includes("releases_client_id_catalog_number_key")) {
        errorMessage =
          "Catalog number already exists. Please use a different catalog number.";
      }
      alert(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="2">
      <Card size="2">
        <Flex direction="column" gap="4">
          <Flex justify="between" align="center">
            <Text size="6" weight="bold">
              New Release for {client.name}
            </Text>
            {isAdmin && (
              <Button variant="soft" size="2" onClick={handleFillTestData}>
                Fill Test Data
              </Button>
            )}
          </Flex>
          <form onSubmit={handleSubmit}>
            <input type="hidden" name="client_id" value={client.id} />
            <input
              type="hidden"
              name="client_folder_id"
              value={client.folderId || ""}
            />
            <input type="hidden" name="client_name" value={client.name} />
            <Flex direction="column" gap="4">
              {/* Artist Information */}
              <Card size="2">
                <Flex direction="column" gap="3">
                  <Text size="4" weight="bold">
                    Artist Information
                  </Text>
                  <input
                    type="text"
                    name="artist_name"
                    placeholder="Artist Name"
                    required
                    value={form.artist_name}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "0.25rem",
                      border: "1px solid #ccc",
                    }}
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="Artist Email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "0.25rem",
                      border: "1px solid #ccc",
                    }}
                  />
                  <input
                    type="text"
                    name="gov_name"
                    placeholder="Full Name"
                    required
                    value={form.gov_name}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "0.25rem",
                      border: "1px solid #ccc",
                    }}
                  />
                  <textarea
                    name="address"
                    placeholder="Artist Address"
                    required
                    value={form.address}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "0.25rem",
                      border: "1px solid #ccc",
                      minHeight: "100px",
                    }}
                  />
                  <input
                    type="url"
                    name="spotify_url"
                    placeholder="Artist Spotify URL (e.g. https://open.spotify.com/artist/...)"
                    pattern="https://open\.spotify\.com/artist/[a-zA-Z0-9]+(\?si=[a-zA-Z0-9-]+)?"
                    value={form.spotify_url}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "0.25rem",
                      border: "1px solid #ccc",
                    }}
                  />
                  <input
                    type="url"
                    name="bandcamp_url"
                    placeholder="Artist Bandcamp URL (e.g. https://artist.bandcamp.com/)"
                    pattern="https://[a-zA-Z0-9-]+\.bandcamp\.com/?.*"
                    value={form.bandcamp_url}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "0.25rem",
                      border: "1px solid #ccc",
                    }}
                  />
                  <input
                    type="url"
                    name="apple_music_url"
                    placeholder="Artist Apple Music URL (e.g. https://music.apple.com/...)"
                    pattern="https://music\.apple\.com/[a-z]{2}/artist/[^/]+/[0-9]+"
                    value={form.apple_music_url}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "0.25rem",
                      border: "1px solid #ccc",
                    }}
                  />
                </Flex>
              </Card>
              {/* Release Information */}
              <Card size="2">
                <Flex direction="column" gap="3">
                  <Text size="4" weight="bold">
                    Release Information
                  </Text>
                  <input
                    type="text"
                    name="catalog_number"
                    placeholder="Catalog Number"
                    required
                    value={form.catalog_number}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "0.25rem",
                      border: "1px solid #ccc",
                    }}
                  />
                  <input
                    type="text"
                    name="name"
                    placeholder="Release Name"
                    required
                    value={form.name}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "0.25rem",
                      border: "1px solid #ccc",
                    }}
                  />
                  <input
                    type="date"
                    name="release_date"
                    required
                    value={form.release_date}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "0.25rem",
                      border: "1px solid #ccc",
                    }}
                  />
                  <div>
                    <Text size="2">Campaign Length</Text>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        marginRight: "1rem",
                      }}
                    >
                      <input
                        type="radio"
                        name="campaign_length"
                        value="8"
                        checked={form.campaign_length === "8"}
                        onChange={handleRadioChange}
                        required
                      />
                      <Text size="2" style={{ marginLeft: "0.5rem" }}>
                        8 Weeks
                      </Text>
                    </label>
                    <label
                      style={{ display: "inline-flex", alignItems: "center" }}
                    >
                      <input
                        type="radio"
                        name="campaign_length"
                        value="12"
                        checked={form.campaign_length === "12"}
                        onChange={handleRadioChange}
                        required
                      />
                      <Text size="2" style={{ marginLeft: "0.5rem" }}>
                        12 Weeks
                      </Text>
                    </label>
                  </div>
                </Flex>
              </Card>
              {/* Team Information */}
              <Card size="2">
                <Flex direction="column" gap="3">
                  <Text size="4" weight="bold">
                    Team Information
                  </Text>
                  <input
                    type="email"
                    name="mastering_engineer_email"
                    placeholder="Mastering Engineer Email"
                    required
                    value={form.mastering_engineer_email}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "0.25rem",
                      border: "1px solid #ccc",
                    }}
                  />
                  <input
                    type="email"
                    name="designer_email"
                    placeholder="Designer Email"
                    required
                    value={form.designer_email}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "0.25rem",
                      border: "1px solid #ccc",
                    }}
                  />
                </Flex>
              </Card>
              {/* Services Required */}
              <Card size="2">
                <Flex direction="column" gap="3">
                  <Text size="4" weight="bold">
                    Services Required
                  </Text>
                  <Flex direction="column" gap="2">
                    {serviceOptions.map((opt) => (
                      <label
                        key={opt.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <input
                          type="checkbox"
                          name="services_required"
                          value={opt.value}
                          checked={form.services_required.includes(opt.value)}
                          onChange={handleChange}
                        />
                        <Text size="2">{opt.label}</Text>
                      </label>
                    ))}
                  </Flex>
                </Flex>
              </Card>
              {/* License Information */}
              <Card size="2">
                <Flex direction="column" gap="3">
                  <Text size="4" weight="bold">
                    License Information
                  </Text>
                  <Flex direction="column" gap="2">
                    {licenseOptions.map((opt) => (
                      <label
                        key={opt.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <input
                          type="checkbox"
                          name={opt.id}
                          checked={form[opt.id as keyof typeof form] as boolean}
                          onChange={handleChange}
                        />
                        <Text size="2">{opt.label}</Text>
                      </label>
                    ))}
                  </Flex>
                </Flex>
              </Card>
              <Button
                type="submit"
                size="3"
                style={{ width: "100%" }}
                color="blue"
                disabled={loading}
              >
                Submit Release
              </Button>
              {error && (
                <Text color="red" size="2" style={{ marginTop: "1rem" }}>
                  {error}
                </Text>
              )}
            </Flex>
          </form>
        </Flex>
      </Card>
      <LoadingDialog open={loading} />
    </Container>
  );
};

export default NewReleaseForm;
