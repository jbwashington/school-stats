import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GraduationCap, Users, Filter, Search } from 'lucide-react'

export default function SchoolsPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Schools Directory</h1>
        <p className="text-xl text-muted-foreground">
          Browse and search NCAA schools with advanced filtering
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter
          </CardTitle>
          <CardDescription>
            Use the filters below to find specific schools
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search */}
          <div className="space-y-2">
            <label htmlFor="search" className="text-sm font-medium">
              Search Schools
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Enter school name..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Division</label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All divisions</SelectItem>
                  <SelectItem value="ncaa-di">NCAA Division I</SelectItem>
                  <SelectItem value="ncaa-dii">NCAA Division II</SelectItem>
                  <SelectItem value="ncaa-diii">NCAA Division III</SelectItem>
                  <SelectItem value="naia">NAIA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Conference</label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All conferences</SelectItem>
                  <SelectItem value="sec">SEC</SelectItem>
                  <SelectItem value="big-ten">Big Ten</SelectItem>
                  <SelectItem value="big-12">Big 12</SelectItem>
                  <SelectItem value="acc">ACC</SelectItem>
                  <SelectItem value="pac-12">Pac-12</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">State</label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  <SelectItem value="alabama">Alabama</SelectItem>
                  <SelectItem value="california">California</SelectItem>
                  <SelectItem value="florida">Florida</SelectItem>
                  <SelectItem value="texas">Texas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex gap-2">
            <Button>Apply Filters</Button>
            <Button variant="outline">Clear All</Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Results</h2>
          <p className="text-sm text-muted-foreground">Showing 3 of 1,063 schools</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">University of Alabama</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    📍 Tuscaloosa, Alabama
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  <Users className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Badge variant="secondary">SEC</Badge>
                <Badge variant="outline">NCAA DI</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mascot:</span>
                  <span className="font-medium">Crimson Tide</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Founded:</span>
                  <span className="font-medium">1831</span>
                </div>
              </div>
              <Button className="w-full">
                <Users className="h-4 w-4 mr-2" />
                View Athletic Staff
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">UCLA</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    📍 Los Angeles, California
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  <Users className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Badge variant="secondary">Big Ten</Badge>
                <Badge variant="outline">NCAA DI</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mascot:</span>
                  <span className="font-medium">Bruins</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Founded:</span>
                  <span className="font-medium">1919</span>
                </div>
              </div>
              <Button className="w-full">
                <Users className="h-4 w-4 mr-2" />
                View Athletic Staff
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">Auburn University</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    📍 Auburn, Alabama
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  <Users className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Badge variant="secondary">SEC</Badge>
                <Badge variant="outline">NCAA DI</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mascot:</span>
                  <span className="font-medium">Tigers</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Founded:</span>
                  <span className="font-medium">1856</span>
                </div>
              </div>
              <Button className="w-full">
                <Users className="h-4 w-4 mr-2" />
                View Athletic Staff
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}