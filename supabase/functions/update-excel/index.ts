class WorkbookClient {
  private accessToken: string;
  private itemId: string | null = null;
  private driveId: string | null = null;

  constructor(private config: any, private url: string) {
    // Reference to Python implementation:
    // excel.py lines 25-44 and auth.py lines 106-140
    
    // Find the correct access token by matching scopes
    const requiredScopes = ['Files.ReadWrite.All'];
    const accessTokenEntries = Object.entries(config.AccessToken);
    
    const matchingToken = accessTokenEntries.find(([key, value]: [string, any]) => {
      const tokenScopes = key.toLowerCase().split(' ');
      return requiredScopes.every(scope => 
        tokenScopes.includes(scope.toLowerCase())
      );
    });

    if (!matchingToken) {
      throw new Error('No valid access token found with required scopes');
    }

    this.accessToken = matchingToken[1].secret;
  }

  async initialize() {
    // Reference to Python implementation:
    // excel.py lines 46-54
    
    if (!this.url) {
      throw new Error('URL is required');
    }

    // Base64 encode the URL as per Microsoft's requirements
    const encodedUrl = btoa(this.url);
    const sharingUrl = `u!${encodedUrl}`;

    // Get drive and item IDs from the sharing URL
    const response = await fetch(`https://graph.microsoft.com/v1.0/shares/${sharingUrl}/driveItem`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get drive item: ${error.message}`);
    }

    const driveItem = await response.json();
    this.driveId = driveItem.parentReference?.driveId;
    this.itemId = driveItem.id;

    if (!this.driveId || !this.itemId) {
      throw new Error('Failed to extract drive and item IDs');
    }
  }

  async writeData(sheetName: string, data: Record<string, any>) {
    if (!this.accessToken || !this.itemId || !this.driveId) {
      throw new Error('Client not initialized');
    }

    const worksheetData = Object.entries(data).map(([key, value]) => [key, String(value)]);
    
    const graphEndpoint = `https://graph.microsoft.com/v1.0/drives/${this.driveId}/items/${this.itemId}/workbook/worksheets/${sheetName}/range(address='A:B')`;
    
    const response = await fetch(graphEndpoint, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: worksheetData
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to update Excel file: ${error.message}`);
    }

    return response.json();
  }
}
