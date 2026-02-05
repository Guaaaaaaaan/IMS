import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';

export default function Settings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-zinc-500 mt-1">System preferences and organization defaults</p>
        </div>
        <Button variant="outline">Save Changes</Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
            <CardDescription>Basic information used across documents and exports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-700">Company Name</label>
              <Input className="mt-1" defaultValue="IMS Admin" />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700">Default Currency</label>
              <Input className="mt-1" defaultValue="SGD" />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700">Timezone</label>
              <Input className="mt-1" defaultValue="Asia/Singapore" />
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button variant="outline">Update Org</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Alerts for low stock, adjustments, and errors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Low stock alerts</p>
                <p className="text-xs text-zinc-500">Email when stock drops below threshold</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Document posting errors</p>
                <p className="text-xs text-zinc-500">Notify on failed postings</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Weekly summary</p>
                <p className="text-xs text-zinc-500">Inventory summary every Monday</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Defaults</CardTitle>
            <CardDescription>Rules that apply to stock and documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-700">Low Stock Threshold</label>
              <Input className="mt-1" defaultValue="10" />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700">Default UoM</label>
              <Input className="mt-1" defaultValue="EA" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Allow negative stock</p>
                <p className="text-xs text-zinc-500">Useful for backorders</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Session policies and access controls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Require re-auth on role change</p>
                <p className="text-xs text-zinc-500">Force users to sign in again</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700">Session Timeout (mins)</label>
              <Input className="mt-1" defaultValue="60" />
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button variant="outline">Apply Security</Button>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supabase Connection</CardTitle>
          <CardDescription>Current project configuration</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge variant="outline">Status: Connected</Badge>
          <Badge variant="outline">Project: o y b v e n y g h m x t z h w a f z h h</Badge>
          <Badge variant="outline">Region: ap-southeast-1</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
